/**
 * 서버가 주는 **오프셋 없는 UTC** 를 화면이 몇 시로 그리는가.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 결함
 *
 * bun 서버는 타임존 표기가 **없는** UTC 를 준다(`2026-08-20T10:59:07.030000`;
 * `domains/shared/datetime.ts` 의 `pgTimestampToPythonIso` 가 그 모양을 만든다).
 * ES 명세는 오프셋 없는 date-time 을 **로컬**로 읽으므로, KST 에서 맨 `new Date(raw)` 는
 * 정확히 9시간 이르게 읽힌다. 커뮤니티 경로는 `parseServerDate` 를 지나 멀쩡했지만
 * 식당 후기 · 상담 · 공지는 맨 `new Date`/`Date.parse` 였고, 그래서
 *
 *   - 한 시간 전에 쓴 후기가 **어제 날짜**로 (09:00 KST 에 08.20 이 아니라 08.19),
 *   - 00:30 에 올라온 공지가 **전날 날짜**로,
 *   - 자정 직후의 상담이 어제 칸으로 내려가고 시각도 아홉 시간 어긋나 있었다.
 *
 * ■ 왜 여기서 TZ 를 고정하나
 *
 * 이 결함은 **로컬 오프셋이 0이 아닐 때만** 보인다. CI 가 UTC 로 돌면 고쳐도 안 고쳐도
 * 조용히 통과한다 — 그러면 이 테스트는 아무것도 지키지 않는다. 그래서 KST 로 못 박는다.
 * 검사 이름에는 "안 고쳤다면 무엇이 나왔을지" 를 함께 적어 뒀다(`08.19.수`·`8월 19일`).
 * 두 값이 같아지는 날은 이 스위트가 아무것도 지키지 않게 된 날이다.
 */
/* eslint-disable import/first */
// V8 은 첫 Date 연산 전에 읽은 TZ 를 쓴다. import 보다 위여야 한다.
process.env.TZ = "Asia/Seoul"

import fs from "node:fs"
import path from "node:path"

import koCommon from "../src/i18n/locales/ko/common.json"
import {
  mapChatCreate,
  mapChatDetail,
  mapChatSummary,
  mapMessage,
  type ChatDetail,
  type ChatSummary,
  type MessageData,
} from "../src/types/chat"
import { reviewDateParts } from "../src/features/restaurant/utils/reviewFormat"
import { parseServerDate } from "../src/shared/utils/serverDate"
import { useNotificationHistoryStore } from "../src/stores/notificationHistoryStore"
import { codeOnly } from "./helpers/codeOnly"

const ROOT = path.join(__dirname, "..")

/** 기준 시각: 2026-08-20 09:00 KST. 서버 표기로는 `…T00:00:00`. */
const NOW_KST_0900 = Date.parse("2026-08-20T00:00:00Z")

/** 그 한 시간 전(08:00 KST)을 서버가 적는 모양. 오프셋 표기가 **없다**. */
const NAIVE_ONE_HOUR_AGO = "2026-08-19T23:00:00"

/** 00:30 KST 를 서버가 적는 모양. 날짜 경계를 넘는 값이다. */
const NAIVE_HALF_PAST_MIDNIGHT = "2026-08-19T15:30:00.030000"

const HOUR = 3_600_000

function source(relative: string): string {
  return codeOnly(fs.readFileSync(path.join(ROOT, relative), "utf8"))
}

describe("전제", () => {
  it("KST 로 돈다 (이게 깨지면 아래 검사는 전부 무의미하다)", () => {
    expect(new Date().getTimezoneOffset()).toBe(-540)
  })

  it("두 시각은 실제로 날짜 경계를 사이에 두고 있다", () => {
    // 안 고친 코드가 무엇을 보는지 — 아래 검사들의 `WRONG_*` 근거.
    expect(new Date(NAIVE_ONE_HOUR_AGO).getDate()).toBe(19)
    expect(parseServerDate(NAIVE_ONE_HOUR_AGO).getDate()).toBe(20)
  })
})

/* ────────────────────────────────────────────────────────────────────────────
   식당 후기 — `reviewDateParts` (후기 카드 · 작성자 프로필 · 사진 뷰어가 함께 쓴다)
   ──────────────────────────────────────────────────────────────────────────── */
describe("식당 후기 날짜", () => {
  const WEEKDAY = koCommon.restaurant.weekdayShort
  const FORMAT = koCommon.restaurant.review.date

  /** 화면이 `t("restaurant.review.date", {...})` 로 만드는 문자열 그대로. */
  function render(iso: string): string {
    const parts = reviewDateParts(iso)
    if (!parts) return ""
    const key = parts.weekdayKey.split(".").pop() as keyof typeof WEEKDAY
    return FORMAT.replace("{{month}}", parts.month)
      .replace("{{day}}", parts.day)
      .replace("{{weekday}}", WEEKDAY[key])
  }

  it("서식이 목업 그대로다 (이 전제가 바뀌면 아래 기대값도 바뀐다)", () => {
    expect(FORMAT).toBe("{{month}}.{{day}}.{{weekday}}")
  })

  it("한 시간 전 후기는 `08.20.목` 이다 (안 고쳤다면 `08.19.수`)", () => {
    expect(render(NAIVE_ONE_HOUR_AGO)).toBe("08.20.목")
  })

  it("00:30 에 쓴 후기는 `08.20.목` 이다 (안 고쳤다면 `08.19.수` — 전날)", () => {
    expect(render(NAIVE_HALF_PAST_MIDNIGHT)).toBe("08.20.목")
  })

  it("이미 오프셋이 붙어 온 값에 `Z` 를 한 번 더 붙이지 않는다", () => {
    // 여기서 실수하면 **반대 방향으로** 9시간 어긋난다.
    expect(render("2026-08-19T15:30:00Z")).toBe("08.20.목")
    expect(render("2026-08-20T00:30:00+09:00")).toBe("08.20.목")
  })

  it("못 읽는 값은 날짜 줄을 비운다 (Invalid Date 를 그리지 않는다)", () => {
    expect(reviewDateParts(null)).toBeNull()
    expect(reviewDateParts("어제")).toBeNull()
  })

  /*
    후기 카드는 같은 이름의 사본을 **자기 파일 안에** 들고 있었다(`Date.parse` 판). 그래서
    작성자 프로필·사진 뷰어를 고쳐도 카드만 계속 틀렸다. 이 저장소에는 렌더러가 없어
    "카드가 어느 함수를 부르는가" 는 소스로만 볼 수 있다(`navigationBackGuard` 와 같은 처방).
  */
  it("후기 카드는 사본을 두지 않고 공용 함수를 부른다", () => {
    const card = source(
      "src/features/restaurant/components/detail/ReviewCard.tsx",
    )
    expect(card).toMatch(
      /import \{ reviewDateParts \} from "\.\.\/\.\.\/utils\/reviewFormat"/u,
    )
    expect(card).not.toMatch(/function reviewDateParts/u)
    expect(card).not.toMatch(/Date\.parse\(/u)
  })

  it("공용 함수는 맨 `new Date` 로 읽지 않는다", () => {
    const util = source("src/features/restaurant/utils/reviewFormat.ts")
    expect(util).toMatch(/parseServerDate\(iso\)/u)
    expect(util).not.toMatch(/new Date\(\s*iso\s*\)/u)
  })
})

/* ────────────────────────────────────────────────────────────────────────────
   상담 — `src/types/chat.ts` 의 매퍼들
   ──────────────────────────────────────────────────────────────────────────── */
describe("상담 대화·메시지 시각", () => {
  const summary: ChatSummary = {
    conversationId: 1,
    title: "물 섭취량",
    summary: null,
    status: "ACTIVE",
    category: "FOOD_DIET",
    categoryLabel: null,
    messageCount: 2,
    createdAt: NAIVE_HALF_PAST_MIDNIGHT,
    updatedAt: NAIVE_ONE_HOUR_AGO,
  }

  const message: MessageData = {
    messageId: 10,
    role: "USER",
    content: "안녕하세요",
    category: null,
    categoryLabel: null,
    createdAt: NAIVE_HALF_PAST_MIDNIGHT,
  }

  const detail: ChatDetail = {
    conversationId: 1,
    title: "물 섭취량",
    category: null,
    categoryLabel: null,
    summary: null,
    status: "ACTIVE",
    createdAt: NAIVE_HALF_PAST_MIDNIGHT,
    updatedAt: NAIVE_ONE_HOUR_AGO,
    messages: [message],
  }

  /** `ChatHistorySheet` 의 `formatRowTime` 이 오래된 줄에 쓰는 서식 그대로. */
  function monthDay(date: Date): string {
    return `${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  /** 같은 화면이 오늘 줄에 쓰는 `HH:MM`(로컬 시계). */
  function clock(date: Date): string {
    return `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes(),
    ).padStart(2, "0")}`
  }

  it("00:30 에 시작한 대화는 `8월 20일 00:30` 이다 (안 고쳤다면 `8월 19일 15:30`)", () => {
    const chat = mapChatSummary(summary)
    expect(monthDay(chat.createdAt)).toBe("8월 20일")
    expect(clock(chat.createdAt)).toBe("00:30")
    expect(chat.createdAt.toISOString()).toBe("2026-08-19T15:30:00.030Z")
  })

  it("한 시간 전에 오간 대화는 딱 한 시간 전이다 (안 고쳤다면 열 시간)", () => {
    const chat = mapChatSummary(summary)
    expect(NOW_KST_0900 - chat.updatedAt.getTime()).toBe(HOUR)
    expect(clock(chat.updatedAt)).toBe("08:00")
  })

  it("상세·메시지·생성 응답도 같은 규칙으로 읽는다", () => {
    const { conversation, messages } = mapChatDetail(detail)
    expect(clock(conversation.createdAt)).toBe("00:30")
    expect(clock(conversation.updatedAt)).toBe("08:00")
    expect(clock(messages[0].createdAt)).toBe("00:30")

    expect(clock(mapMessage(message, 1).createdAt)).toBe("00:30")

    const created = mapChatCreate({
      conversationId: 1,
      title: "물 섭취량",
      category: null,
      categoryLabel: null,
      createdAt: NAIVE_HALF_PAST_MIDNIGHT,
    })
    expect(clock(created.conversation.createdAt)).toBe("00:30")
  })

  it("오프셋이 붙어 온 값은 그대로 읽는다 (두 번 보정하지 않는다)", () => {
    const chat = mapChatSummary({
      ...summary,
      createdAt: "2026-08-19T15:30:00.030Z",
    })
    expect(clock(chat.createdAt)).toBe("00:30")
  })
})

/* ────────────────────────────────────────────────────────────────────────────
   공지 — 목록 · 상세의 `formatNoticeDate`
   ──────────────────────────────────────────────────────────────────────────── */
describe("공지 날짜", () => {
  const SCREENS = [
    "src/features/settings/views/AnnouncementListScreen.tsx",
    "src/features/settings/views/AnnouncementDetailScreen.tsx",
  ]

  /** 두 화면의 `formatNoticeDate` 본문 그대로. */
  function render(value: string, language: "ko" | "en"): string {
    if (/^\d{4}\.\d{2}\.\d{2}/.test(value)) return value
    const date = parseServerDate(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString(language === "en" ? "en-US" : "ko-KR")
  }

  it("00:30 에 올라온 공지는 8월 20일이다 (안 고쳤다면 8월 19일 — 전날)", () => {
    expect(render(NAIVE_HALF_PAST_MIDNIGHT, "ko")).toBe("2026. 8. 20.")
    expect(render(NAIVE_HALF_PAST_MIDNIGHT, "en")).toBe("8/20/2026")
  })

  it("한 시간 전 공지도 오늘 날짜다", () => {
    expect(render(NAIVE_ONE_HOUR_AGO, "ko")).toBe("2026. 8. 20.")
  })

  it("번들 폴백의 `YYYY.MM.DD` 는 손대지 않는다", () => {
    expect(render("2026.07.21", "ko")).toBe("2026.07.21")
  })

  it("두 화면 모두 `parseServerDate` 를 지난다", () => {
    for (const screen of SCREENS) {
      const text = source(screen)
      expect(text).toMatch(/parseServerDate\(value\)/u)
      expect(text).not.toMatch(/new Date\(\s*value\s*\)/u)
    }
  })
})

/* ────────────────────────────────────────────────────────────────────────────
   알림 내역 — **여기는 고치면 안 된다**
   ──────────────────────────────────────────────────────────────────────────── */
describe("알림 내역은 서버 시각이 아니다", () => {
  it("저장소가 직접 찍는다 — 언제나 `Z` 가 붙는다", () => {
    useNotificationHistoryStore.getState().clearAll()
    useNotificationHistoryStore
      .getState()
      .addNotification({ type: "food_analysis", foodName: "된장찌개" })
    const [item] = useNotificationHistoryStore.getState().items
    expect(item.timestamp).toMatch(/Z$/u)
    // 서버에서 오는 값이 아니라는 증거: 방금 찍힌 값이다.
    expect(Math.abs(Date.now() - Date.parse(item.timestamp))).toBeLessThan(
      5_000,
    )
    useNotificationHistoryStore.getState().clearAll()
  })

  it("화면은 UTC 보정을 얹지 않는다 (얹으면 반대로 9시간 어긋난다)", () => {
    const screen = source(
      "src/features/settings/views/NotificationHistoryScreen.tsx",
    )
    expect(screen).not.toMatch(/parseServerDate/u)
    expect(screen).toMatch(/new Date\(iso\)\.getTime\(\)/u)
  })
})
