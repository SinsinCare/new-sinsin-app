/**
 * 영업 상태 표시. 서버가 KST 로 계산해 준 `BusinessStatusCode` + `nextTransitionAt` 을
 * 화면 문구·색으로 옮긴다.
 *
 * ## 판정은 서버가, 표시는 여기서
 *
 * 상태를 클라이언트에서 다시 계산하지 않는다. 요일별 다중 구간·브레이크타임·자정 넘김·
 * 라스트오더를 두 곳에서 구현하면 반드시 어긋나고, 기기 시계가 틀린 사용자에게는
 * "영업중" 인 가게가 "휴무" 로 보인다. 서버는 KST 고정(`now + 9h` 후 UTC 게터)으로 판정한다.
 *
 * ## 폴링하지 않는다
 *
 * 그래도 화면은 21:30 이 지나는 순간 "영업중" 을 "영업종료" 로 바꿔야 한다. 그래서
 * `nextTransitionAt`(다음 전환 시각) 하나만 받아 **그 시각에 딱 한 번 깨어나는
 * `setTimeout`** 을 건다(`scheduleNextTransition`). 1초 인터벌로 시계를 돌리면 지도 화면
 * 전체가 매초 리렌더되고 배터리를 먹는다. 카운트다운 숫자를 보여 주지 않는 UI 에서
 * 초당 갱신은 순수한 낭비다.
 *
 * ## `DAY_OFF` 에 `closeTime` 을 쓰지 않는다 (프로토타입 복붙 버그)
 *
 * 프로토타입은 휴무일에도 `${closeTime}까지` 를 붙여 "휴무일 21:30까지" 를 출력했다.
 * 문 닫은 날의 마감 시각은 뜻이 없다. `DAY_OFF` 는 **다음 영업일**을 말하거나 아무 말도
 * 하지 않는다. 이 파일에서 `closingTime` 이 `DAY_OFF`/`UNKNOWN` 분기로 새지 못하게 막았다.
 */

import type { SemanticColors } from "@/src/design-system-v2"

import type { BusinessStatusCode, Weekday } from "../types"

/** 상태 톤. 목업 §2.8 의 색 규칙 그대로. */
export type BusinessStatusTone = "normal" | "brand" | "negative" | "muted"

export interface BusinessStatusInput {
  status: BusinessStatusCode
  /** `HH:MM`. 영업중일 때의 마감 시각. */
  closingTime?: string | null
  /** `HH:MM`. 영업전일 때의 오픈 시각. */
  openingTime?: string | null
  /**
   * `HH:MM`. 브레이크타임 **시작** 시각.
   *
   * 영업중일 때 다음에 일어날 일이 마감이 아니라 브레이크타임인지 가리는 데만 쓴다.
   * 이 값만으로는 지금이 브레이크 전인지 후인지 알 수 없으므로 `nextTransitionAt`
   * 과 **짝으로만** 뜻을 갖는다 — 아래 `describeBusinessStatus` 의 `OPEN` 분기 참고.
   */
  breakStartTime?: string | null
  /** `HH:MM`. 브레이크타임 종료 시각. */
  breakEndTime?: string | null
  /**
   * 다음 상태 전환 시각(ISO, 서버는 KST 오프셋으로 준다).
   *
   * 여기서는 **시각 비교가 아니라 이름 붙이기**에만 쓴다. "지금 몇 시인가" 는 여전히
   * 서버가 판정하고(`status`), 이 값은 그 판정이 가리키는 다음 사건이 무엇인지를
   * 알려 주는 표지일 뿐이다. 기기 시계는 여기 어디에도 들어오지 않는다.
   */
  nextTransitionAt?: string | null
  /** `HH:MM`. 라스트오더. 있으면 보조 줄에 덧붙인다. */
  lastOrder?: string | null
  /** 휴무일일 때 다음 영업 요일. */
  nextOpenWeekday?: Weekday | null
  /** 휴무일일 때 다음 영업 시작 시각(`HH:MM`). */
  nextOpenTime?: string | null
}

export interface BusinessStatusView {
  status: BusinessStatusCode
  /** 상태 라벨. `restaurant.businessStatus.<status>` */
  labelKey: string
  tone: BusinessStatusTone
  /** 상태 라벨 색. `useV2Theme()` 의 `colors` 에서 뽑은 값이다. */
  color: string
  /**
   * 보조 문구 키. `null` 이면 보조 줄을 **그리지 않는다** — 빈 문자열을 넣어
   * 자리만 차지하게 두면 카드 높이가 흔들린다.
   */
  subLabelKey: string | null
  /** `subLabelKey` 의 보간 값. */
  subParams: Record<string, string> | null
}

const TONE_BY_STATUS: Record<BusinessStatusCode, BusinessStatusTone> = {
  // 영업중은 강조하지 않는다 — 기본 상태다.
  OPEN: "normal",
  /* 영업전도 `OPEN` 과 같은 gray-900 이다. DESIGN_SPEC §2.8 의 표는 브랜드 오렌지라고
     적었지만 그 표가 원본 아트를 잘못 읽었다 — 목업 -21 의 `영업전` 글리프를 뽑으면
     `#3A3A47` 로 두 카드 위의 `영업중`(`#42424E`)과 같은 톤이고, 빨강은 `휴무일`
     (`#FF5252`)뿐이다. 색이 갈리는 기준은 "지금 갈 수 있는가" 가 아니라 "오늘 문을 여는가"
     이므로 영업전은 중립이 맞다. */
  BEFORE_OPEN: "normal",
  // 목업: 브레이크타임과 휴무일은 둘 다 빨강. 지금 갈 수 없다는 뜻이 같다.
  BREAK_TIME: "negative",
  DAY_OFF: "negative",
  CLOSED: "negative",
  // 정보가 없는 것은 나쁜 소식이 아니다. 회색으로 조용히 둔다.
  UNKNOWN: "muted",
}

function colorForTone(
  tone: BusinessStatusTone,
  colors: SemanticColors,
): string {
  switch (tone) {
    case "brand":
      return colors.primary.primary
    case "negative":
      return colors.status.negative
    case "muted":
      return colors.label.assistive
    case "normal":
    default:
      return colors.label.normal
  }
}

/**
 * 서버가 준 전환 시각(ISO)에서 **벽시계 `HH:MM`** 만 꺼낸다. 못 꺼내면 `null`.
 *
 * `new Date(...).getHours()` 를 쓰지 않는 이유가 이 함수의 존재 이유다. 그 게터는
 * **기기 시간대**로 읽으므로, 시계가 UTC 인 시뮬레이터나 해외 사용자에게 21:30 이
 * 12:30 으로 보이고, 그 값을 `breakStart`(KST 벽시계 문자열)와 견주면 영원히 어긋난다.
 * 서버는 `2026-07-31T15:00:00+09:00` 처럼 **KST 오프셋을 붙여** 주므로 문자열의
 * `T` 뒤 다섯 글자가 곧 우리가 비교하고 싶은 그 벽시계다.
 *
 * 오프셋이 `+09:00` 이 아니면 (예: `Z` 로 정규화된 응답) 문자열의 시각은 KST 벽시계가
 * 아니다. 그때는 **모른다고 답한다** — 여기서 시간대 변환을 흉내내면 이 파일이
 * 하지 않기로 한 "클라이언트 재계산" 을 뒷문으로 들이게 된다.
 */
export function transitionWallClock(
  nextTransitionAt: string | null | undefined,
): string | null {
  if (!nextTransitionAt) return null
  const match =
    /^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})(?::\d{2})?(?:\.\d+)?\+09:00$/.exec(
      nextTransitionAt,
    )
  return match ? match[1] : null
}

/**
 * 상태 → 화면 문구·색.
 *
 * 보조 문구 규칙:
 * - `OPEN` → 다음 전환이 브레이크타임이면 `15:00에 브레이크타임`, 아니면 `21:30까지`
 * - `BEFORE_OPEN` → `11:00 오픈`
 * - `BREAK_TIME` → `15:00부터 다시 영업`
 * - `CLOSED` → 보조 없음 (오늘은 끝났다는 것 외에 할 말이 없다)
 * - `DAY_OFF` → 다음 영업일을 알 때만 `수요일 11:00 오픈`. **절대 `closingTime` 을 안 쓴다.**
 * - `UNKNOWN` → 보조 없음
 */
export function describeBusinessStatus(
  input: BusinessStatusInput,
  colors: SemanticColors,
): BusinessStatusView {
  const tone = TONE_BY_STATUS[input.status] ?? "muted"
  const base = {
    status: input.status,
    labelKey: `restaurant.businessStatus.${input.status}`,
    tone,
    color: colorForTone(tone, colors),
  }

  switch (input.status) {
    case "OPEN": {
      /*
        마감만 말하면 **다음에 일어날 일**을 놓친다.

        브레이크타임이 있는 가게에서 `영업중 21:30까지` 는 지금 출발해도 되는 것처럼
        읽히지만 실제로는 15:00 에 문이 닫힌다. 네이버가 `영업 중 · 15:00에 브레이크타임`
        을 쓰는 이유가 이것이다.

        판정을 새로 하지 않는다. 서버가 이미 "다음 전환은 이 시각" 이라고 말했고
        (`nextTransitionAt`), 그 시각이 브레이크 시작과 같은 벽시계면 다음 사건은
        브레이크다. 브레이크가 끝난 뒤라면 서버의 다음 전환은 마감 시각이므로 이 비교가
        저절로 빗나가고 `까지` 로 돌아온다 — 우리가 "지금 브레이크 전인가" 를 따로
        계산할 필요가 없는 것이 요점이다.

        전환 시각을 못 읽으면(카드 응답에는 그 필드가 아예 없다) 예전 문구 그대로다.
      */
      if (
        input.breakStartTime &&
        transitionWallClock(input.nextTransitionAt) === input.breakStartTime
      ) {
        return {
          ...base,
          subLabelKey: "restaurant.businessStatus.breakAt",
          subParams: { time: input.breakStartTime },
        }
      }
      if (!input.closingTime)
        return { ...base, subLabelKey: null, subParams: null }
      return {
        ...base,
        subLabelKey: "restaurant.businessStatus.until",
        subParams: { time: input.closingTime },
      }
    }
    case "BEFORE_OPEN": {
      if (!input.openingTime)
        return { ...base, subLabelKey: null, subParams: null }
      return {
        ...base,
        subLabelKey: "restaurant.businessStatus.opensAt",
        subParams: { time: input.openingTime },
      }
    }
    case "BREAK_TIME": {
      if (!input.breakEndTime)
        return { ...base, subLabelKey: null, subParams: null }
      return {
        ...base,
        subLabelKey: "restaurant.businessStatus.breakUntil",
        subParams: { time: input.breakEndTime },
      }
    }
    case "DAY_OFF": {
      // 다음 영업일과 시각이 **둘 다** 있어야 말한다. 하나라도 없으면 침묵한다 —
      // 여기서 closingTime 으로 폴백하면 프로토타입의 "휴무일 21:30까지" 가 되살아난다.
      if (!input.nextOpenWeekday || !input.nextOpenTime) {
        return { ...base, subLabelKey: null, subParams: null }
      }
      return {
        ...base,
        subLabelKey: "restaurant.businessStatus.nextOpen",
        subParams: {
          day: `restaurant.weekday.${input.nextOpenWeekday}`,
          time: input.nextOpenTime,
        },
      }
    }
    case "CLOSED":
    case "UNKNOWN":
    default:
      return { ...base, subLabelKey: null, subParams: null }
  }
}

/** 지금부터 전환 시각까지 남은 ms. 이미 지났거나 값이 없으면 `null`. */
export function msUntilTransition(
  nextTransitionAt: string | null | undefined,
  now: number = Date.now(),
): number | null {
  if (!nextTransitionAt) return null
  const at = Date.parse(nextTransitionAt)
  if (Number.isNaN(at)) return null
  const remaining = at - now
  return remaining > 0 ? remaining : null
}

/**
 * 상한. `setTimeout` 의 딜레이는 32비트 정수로 잘려 약 24.8일이 넘으면 **즉시 실행**된다
 * (그러면 무한 재예약 루프가 된다). 서버가 잘못된 미래 시각을 주더라도 하루 뒤에
 * 한 번 깨어나 다시 계산하도록 자른다.
 */
const MAX_TIMEOUT_MS = 24 * 60 * 60 * 1000

/**
 * 전환 시각에 **한 번만** 깨어나는 타이머. 인터벌 폴링을 쓰지 않는다.
 * 반환값은 취소 함수다 — 언마운트에서 반드시 호출한다.
 *
 * 값이 없거나 이미 지난 시각이면 아무 것도 예약하지 않고 no-op 을 돌려준다
 * (지난 시각으로 `setTimeout(0)` 을 걸면 렌더 루프가 된다).
 */
export function scheduleNextTransition(
  nextTransitionAt: string | null | undefined,
  onTransition: () => void,
): () => void {
  const remaining = msUntilTransition(nextTransitionAt)
  if (remaining === null) return () => {}
  // +1s: 경계에서 정확히 깨면 서버가 아직 이전 상태를 계산할 수 있다. 한 박자 늦게 묻는다.
  const delay = Math.min(remaining + 1000, MAX_TIMEOUT_MS)
  const timer = setTimeout(onTransition, delay)
  return () => clearTimeout(timer)
}

/*
  `lastOrderLabel()`·`weekdayLabelKey()`·`WEEKDAY_ORDER` 는 여기 없다 (일부러 지웠다).
  라스트오더 문구는 `BusinessStatusText` 가, 요일 키는 위 `describeBusinessStatus` 가
  각각 `restaurant.businessStatus.lastOrder` / `restaurant.weekday.<Weekday>` 를 직접
  조립한다. 세 헬퍼는 테스트만 부르고 있어서, 남겨 두면 "앱이 이 경로로 문구를 만든다"
  는 거짓 계약이 된다.
*/
