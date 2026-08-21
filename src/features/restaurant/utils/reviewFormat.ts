/**
 * 후기·사진의 날짜와 태그 칩 서식. 목업 -16/-30 의 `07.21.화` 와 `+2` 가 여기서 나온다.
 *
 * ## 왜 `Intl` 을 쓰지 않았나
 *
 * `Intl.DateTimeFormat` 은 Hermes 에 있지만 이 저장소는 `Intl.RelativeTimeFormat`·
 * `ListFormat`·`Segmenter` 등을 eslint 로 금지하고 있고(엔진 편차), 무엇보다
 * 목업의 `07.21.화` 는 **어떤 로케일의 표준 포맷도 아니다.** 그래서 서식 문자열 자체를
 * i18n 리소스(`restaurant.review.dateFormat`)로 두고 조각만 여기서 만든다.
 * 그러면 영어에서는 `07.21 Tue` 로 어순을 바꿀 수 있다 — 코드 수정 없이.
 *
 * ## 타임존 — **읽기와 그리기는 다른 규칙이다**
 *
 * 서버의 `createdAt` 은 오프셋 표기가 없는 UTC 다(`2026-08-20T10:59:07.030000`;
 * bun 서버의 `pgTimestampToPythonIso` 가 그 모양을 만든다). 그리는 것은 사용자 기기
 * 시각이 맞지만 — 영업 여부는 가게가 있는 곳의 시간, 후기 날짜는 읽는 사람의 시간 —
 * **그렇다고 파싱까지 로컬로 하면 안 된다.** ES 명세는 오프셋 없는 date-time 을 로컬로
 * 읽으므로 `new Date(iso)` 는 KST 에서 정확히 9시간 이르게 읽히고, 00:30 에 쓴 후기가
 * **전날 날짜**로 나온다. 종전 주석은 "그래서 로컬 게터가 맞다" 로 끝났는데, 그 결론이
 * 바로 결함이었다.
 *
 * 그래서 **읽기는 UTC(`parseServerDate`), 그리기는 로컬 게터**다. 두 규칙이 다 필요하다.
 * (`tests/serverDateRendering.test.ts` 가 KST 로 못 박아 검사한다.)
 */

import { parseServerDate } from "@/src/shared/utils/serverDate"

import type { ReviewKeyword } from "../types"

const WEEKDAY_KEYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

export interface ReviewDateParts {
  month: string
  day: string
  /** `restaurant.weekdayShort.<KEY>` */
  weekdayKey: string
}

/**
 * ISO 문자열 → `{ month:"07", day:"21", weekdayKey:"restaurant.weekdayShort.TUE" }`.
 * 파싱 불가면 `null` — 화면은 날짜 줄을 **감춘다**. `Invalid Date` 를 그리지 않는다.
 */
export function reviewDateParts(iso: string | null): ReviewDateParts | null {
  if (!iso) return null
  // 읽기는 UTC, 아래 게터는 로컬. 이유는 이 파일 머리말의 "타임존".
  const parsed = parseServerDate(iso)
  if (Number.isNaN(parsed.getTime())) return null
  return {
    month: pad2(parsed.getMonth() + 1),
    day: pad2(parsed.getDate()),
    weekdayKey: `restaurant.weekdayShort.${WEEKDAY_KEYS[parsed.getDay()]}`,
  }
}

/**
 * 사진 뷰어·후기 카드의 태그 칩. 방문 회차 + 키워드를 한 줄로 합치고 넘치면 `+N` 으로 접는다.
 *
 * 목업 -16 은 `4번째 방문` `😋 맛` `+2` 세 칩이다. 방문 칩 1 + 키워드 3 = 4개 중
 * **2개만 보이고 2개가 접힌** 모양이므로 가시 개수는 2다. 이 숫자를 바꾸면 목업과 어긋난다.
 */
export const MAX_VISIBLE_REVIEW_TAGS = 2

export interface ReviewTag {
  /** i18n 키 또는 이미 만들어진 라벨을 구분하기 위한 태그. */
  kind: "visit" | "keyword"
  /** `keyword` 일 때만 채운다. */
  keyword?: ReviewKeyword
  /** `visit` 일 때만 채운다. */
  visitCount?: number
}

export interface ReviewTagLayout {
  visible: ReviewTag[]
  /** 접힌 개수. 0 이면 `+N` 칩을 그리지 않는다. */
  overflow: number
}

/**
 * `visitCount` 는 **1보다 클 때만** 칩이 된다 — `1번째 방문` 은 정보가 아니다.
 * (DB `visit_count` 의 기본값이 1이라 그대로 그리면 모든 후기에 같은 칩이 붙는다.)
 */
export function reviewTagLayout(input: {
  visitCount: number
  keywords: readonly ReviewKeyword[]
}): ReviewTagLayout {
  const tags: ReviewTag[] = []
  if (input.visitCount > 1) {
    tags.push({ kind: "visit", visitCount: input.visitCount })
  }
  for (const keyword of input.keywords) {
    tags.push({ kind: "keyword", keyword })
  }
  return {
    visible: tags.slice(0, MAX_VISIBLE_REVIEW_TAGS),
    overflow: Math.max(0, tags.length - MAX_VISIBLE_REVIEW_TAGS),
  }
}

/**
 * 통계 숫자의 천단위 구분. `1741` → `1,741` (목업 -30).
 * `toLocaleString` 은 Hermes 에서 로케일에 따라 결과가 흔들려 쓰지 않는다.
 */
export function formatStatCount(value: number): string {
  const sign = value < 0 ? "-" : ""
  const digits = String(Math.abs(Math.trunc(value)))
  let out = ""
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ","
    out += digits[i]
  }
  return `${sign}${out}`
}
