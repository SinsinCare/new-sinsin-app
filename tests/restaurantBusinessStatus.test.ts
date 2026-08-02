/**
 * 영업 상태 **표시**의 계약. 판정은 서버(KST 고정)가 하고 이 파일은 그 값을 문구·색·타이머로
 * 옮기는 층만 본다 — 클라이언트가 상태를 다시 계산하지 않는다는 것이 계약이므로,
 * "지금 몇 시인지" 로 결과가 달라지지 않는다는 것 자체가 여기서 단언할 일이다.
 *
 * 시각 경계(브레이크타임 ±1분, 자정 넘김 01:00) 는 판정 엔진이 사는
 * `sinsin-be-bun/src/domains/restaurant/businessHours.ts` 쪽 테스트가 고정한다
 * (`sinsin-be-bun/tests/restaurant/businessHours.test.ts`). 같은 경계를 이쪽에도
 * 흉내내 두면 판정 규칙이 두 곳에 생기고, 그게 바로 이 파일이 막으려는 결함이다.
 */

import i18n from "../src/i18n"
import { resolveTheme } from "../src/design-system-v2/theme"
import { hasCommonKeyInBothLocales } from "./helpers/i18nResourceKeys"
import type {
  BusinessStatusCode,
  Weekday,
} from "../src/features/restaurant/types"
import {
  WEEKDAY_ORDER,
  describeBusinessStatus,
  lastOrderLabel,
  msUntilTransition,
  scheduleNextTransition,
  weekdayLabelKey,
} from "../src/features/restaurant/utils/businessStatus"

const light = resolveTheme("light").colors
const dark = resolveTheme("dark").colors

const ALL_STATUSES: BusinessStatusCode[] = [
  "OPEN",
  "BEFORE_OPEN",
  "BREAK_TIME",
  "CLOSED",
  "DAY_OFF",
  "UNKNOWN",
]

describe("영업 상태 표시 — 6상태 전량", () => {
  it.each(ALL_STATUSES)("%s 는 라벨 키와 색을 갖는다", (status) => {
    const view = describeBusinessStatus({ status }, light)
    expect(view.status).toBe(status)
    expect(view.labelKey).toBe(`restaurant.businessStatus.${status}`)
    // 색이 undefined 면 RN 이 조용히 검정으로 그린다 — 다크모드에서 안 보이는 문구가 된다.
    expect(view.color).toMatch(/^#/)
    expect(describeBusinessStatus({ status }, dark).color).toMatch(/^#/)
  })

  it.each(ALL_STATUSES)("%s 라벨 키가 ko/en 둘 다에 실제로 있다", (status) => {
    // 키가 없으면 i18next 가 키 문자열을 그대로 돌려주고, 카드에
    // `restaurant.businessStatus.OPEN` 이 찍힌 채 배포된다.
    expect(
      hasCommonKeyInBothLocales(`restaurant.businessStatus.${status}`),
    ).toBe(true)
  })

  /*
    DESIGN_SPEC §2.8 의 표는 `영업전` 을 브랜드 오렌지라고 적었지만 그 표가 원본 아트를
    잘못 읽었다. 목업 -21 의 `영업전` 글리프를 뽑으면 #3A3A47 로 두 카드 위의 `영업중`
    (#42424E)과 같은 톤이고, 빨강은 `휴무일`(#FF5252)뿐이다. 색이 갈리는 기준은
    "지금 갈 수 있는가" 가 아니라 "오늘 문을 여는가" 다.
  */
  it("톤은 목업 -21 그대로다 — 영업중·영업전은 중립, 못 가는 상태만 빨강", () => {
    expect(describeBusinessStatus({ status: "OPEN" }, light).tone).toBe(
      "normal",
    )
    expect(describeBusinessStatus({ status: "BEFORE_OPEN" }, light).tone).toBe(
      "normal",
    )
    expect(describeBusinessStatus({ status: "BREAK_TIME" }, light).tone).toBe(
      "negative",
    )
    expect(describeBusinessStatus({ status: "DAY_OFF" }, light).tone).toBe(
      "negative",
    )
    expect(describeBusinessStatus({ status: "CLOSED" }, light).tone).toBe(
      "negative",
    )
    // 정보가 없는 것은 나쁜 소식이 아니다. 빨강으로 그리면 문 닫은 가게로 읽힌다.
    expect(describeBusinessStatus({ status: "UNKNOWN" }, light).tone).toBe(
      "muted",
    )
    // 영업전과 영업중이 같은 글자색이라는 것이 목업 -21 의 관측값이다.
    expect(describeBusinessStatus({ status: "BEFORE_OPEN" }, light).color).toBe(
      describeBusinessStatus({ status: "OPEN" }, light).color,
    )
    expect(describeBusinessStatus({ status: "BEFORE_OPEN" }, light).color).toBe(
      light.label.normal,
    )
    expect(describeBusinessStatus({ status: "UNKNOWN" }, light).color).toBe(
      light.label.assistive,
    )
  })

  it("보조 문구는 상태별로 정해진 키 하나만 쓴다", () => {
    expect(
      describeBusinessStatus({ status: "OPEN", closingTime: "21:30" }, light),
    ).toMatchObject({
      subLabelKey: "restaurant.businessStatus.until",
      subParams: { time: "21:30" },
    })
    expect(
      describeBusinessStatus(
        { status: "BEFORE_OPEN", openingTime: "11:00" },
        light,
      ),
    ).toMatchObject({
      subLabelKey: "restaurant.businessStatus.opensAt",
      subParams: { time: "11:00" },
    })
    expect(
      describeBusinessStatus(
        { status: "BREAK_TIME", breakEndTime: "17:00" },
        light,
      ),
    ).toMatchObject({
      subLabelKey: "restaurant.businessStatus.breakUntil",
      subParams: { time: "17:00" },
    })
    // 영업종료는 할 말이 없다. 빈 문자열로 자리만 차지하면 카드 높이가 흔들린다.
    expect(
      describeBusinessStatus({ status: "CLOSED", closingTime: "21:30" }, light)
        .subLabelKey,
    ).toBeNull()
    expect(
      describeBusinessStatus({ status: "UNKNOWN" }, light).subLabelKey,
    ).toBeNull()
  })

  it("값이 없으면 보조 줄을 아예 그리지 않는다", () => {
    for (const status of ALL_STATUSES) {
      const view = describeBusinessStatus({ status }, light)
      expect(view.subLabelKey).toBeNull()
      expect(view.subParams).toBeNull()
    }
  })
})

describe("휴무일에는 마감 시각을 말하지 않는다 (프로토타입 복붙 버그)", () => {
  it("closeTime 이 들어와도 DAY_OFF 는 `까지` 로 새지 않는다", () => {
    // 프로토타입: `{ label: '휴무일', sub: closeTime ? `${closeTime}까지` : '' }`
    // → "휴무일 21:30까지". 문 닫은 날의 마감 시각은 존재하지 않는다.
    const view = describeBusinessStatus(
      {
        status: "DAY_OFF",
        closingTime: "21:30",
        openingTime: "11:00",
        breakEndTime: "17:00",
        lastOrder: "21:00",
      },
      light,
    )
    expect(view.subLabelKey).toBeNull()
    expect(view.subParams).toBeNull()
  })

  it("다음 영업일을 둘 다 알 때만 말한다", () => {
    const view = describeBusinessStatus(
      {
        status: "DAY_OFF",
        closingTime: "21:30",
        nextOpenWeekday: "WED",
        nextOpenTime: "11:00",
      },
      light,
    )
    expect(view.subLabelKey).toBe("restaurant.businessStatus.nextOpen")
    expect(view.subParams).toEqual({
      day: "restaurant.weekday.WED",
      time: "11:00",
    })
  })

  it("요일만 있고 시각이 없으면 침묵한다", () => {
    expect(
      describeBusinessStatus(
        { status: "DAY_OFF", nextOpenWeekday: "WED", closingTime: "21:30" },
        light,
      ).subLabelKey,
    ).toBeNull()
    expect(
      describeBusinessStatus(
        { status: "DAY_OFF", nextOpenTime: "11:00", closingTime: "21:30" },
        light,
      ).subLabelKey,
    ).toBeNull()
  })

  it("실제 렌더 문자열에 `까지` 가 들어가지 않는다", async () => {
    await i18n.changeLanguage("ko")
    const dayOff = describeBusinessStatus(
      {
        status: "DAY_OFF",
        closingTime: "21:30",
        nextOpenWeekday: "WED",
        nextOpenTime: "11:00",
      },
      light,
    )
    expect(dayOff.subLabelKey).toBe("restaurant.businessStatus.nextOpen")
    const rendered = i18n.t("restaurant.businessStatus.nextOpen", {
      day: i18n.t("restaurant.weekday.WED"),
      time: dayOff.subParams?.time ?? "",
    })
    expect(rendered).toBe("수요일 11:00 오픈")
    expect(rendered).not.toContain("까지")

    // 대비: `까지` 는 영업중일 때만 나온다.
    const open = describeBusinessStatus(
      { status: "OPEN", closingTime: "21:30" },
      light,
    )
    expect(open.subLabelKey).toBe("restaurant.businessStatus.until")
    expect(
      i18n.t("restaurant.businessStatus.until", {
        time: open.subParams?.time ?? "",
      }),
    ).toBe("21:30까지")
  })

  it("`until` 키는 OPEN 이외의 어떤 상태에서도 나오지 않는다", () => {
    const withEverything = {
      closingTime: "21:30",
      openingTime: "11:00",
      breakEndTime: "17:00",
      nextOpenWeekday: "WED" as Weekday,
      nextOpenTime: "11:00",
    }
    for (const status of ALL_STATUSES) {
      const view = describeBusinessStatus({ status, ...withEverything }, light)
      if (view.subLabelKey === "restaurant.businessStatus.until") {
        expect(status).toBe("OPEN")
      }
    }
  })
})

describe("표시 전용 — 기기 시계로 판정을 다시 하지 않는다", () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it("같은 입력이면 새벽 3시에도 낮 12시에도 같은 결과다", () => {
    const input = {
      status: "OPEN" as BusinessStatusCode,
      closingTime: "02:00",
      openingTime: "17:00",
    }
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2026-07-30T18:00:00+09:00")) // KST 18:00
    const evening = describeBusinessStatus(input, light)
    jest.setSystemTime(new Date("2026-07-31T03:00:00+09:00")) // KST 새벽 3시
    const dawn = describeBusinessStatus(input, light)
    // 기기 시계가 틀린 사용자에게 영업중인 가게가 휴무로 보이는 결함을 막는 계약이다.
    expect(dawn).toEqual(evening)
  })
})

describe("라스트오더 보조 줄", () => {
  it("값이 있을 때만 붙는다", () => {
    expect(lastOrderLabel("21:00")).toEqual({
      labelKey: "restaurant.businessStatus.lastOrder",
      params: { time: "21:00" },
    })
    expect(lastOrderLabel(null)).toBeNull()
    expect(lastOrderLabel(undefined)).toBeNull()
    expect(lastOrderLabel("")).toBeNull()
  })
})

describe("전환 타이머 — 폴링하지 않는다", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2026-07-30T12:00:00+09:00"))
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it("전환 시각까지 남은 ms 를 준다", () => {
    expect(msUntilTransition("2026-07-30T12:00:30+09:00")).toBe(30_000)
  })

  it("없거나 못 읽거나 이미 지난 시각은 null 이다", () => {
    expect(msUntilTransition(null)).toBeNull()
    expect(msUntilTransition(undefined)).toBeNull()
    expect(msUntilTransition("")).toBeNull()
    expect(msUntilTransition("어제")).toBeNull()
    // 지난 시각으로 setTimeout(0) 을 걸면 렌더 루프가 된다.
    expect(msUntilTransition("2026-07-30T11:59:59+09:00")).toBeNull()
  })

  it("오프셋 없는 문자열을 로컬시간으로 읽지 않게 오프셋을 명시해 파싱한다", () => {
    // 서버는 `+09:00` 을 붙여 준다. 붙어 있으면 프로세스 타임존과 무관하게 같은 순간이다.
    expect(msUntilTransition("2026-07-30T03:00:30Z")).toBe(30_000)
  })

  it("인터벌을 돌리지 않고 타이머 하나만 예약한다", () => {
    const interval = jest.spyOn(global, "setInterval")
    const onTransition = jest.fn()
    const cancel = scheduleNextTransition(
      "2026-07-30T12:00:30+09:00",
      onTransition,
    )

    expect(interval).not.toHaveBeenCalled()
    expect(jest.getTimerCount()).toBe(1)

    // +1s 여유가 계약이다 — 경계에서 정확히 깨면 서버가 아직 이전 상태를 계산한다.
    jest.advanceTimersByTime(30_000)
    expect(onTransition).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1_000)
    expect(onTransition).toHaveBeenCalledTimes(1)

    // 한 번 깨고 나면 스스로 다시 예약하지 않는다(재조회는 화면이 결정한다).
    jest.advanceTimersByTime(6 * 60 * 60 * 1000)
    expect(onTransition).toHaveBeenCalledTimes(1)
    expect(interval).not.toHaveBeenCalled()
    cancel()
  })

  it("취소 함수가 타이머를 실제로 끈다", () => {
    const onTransition = jest.fn()
    const cancel = scheduleNextTransition(
      "2026-07-30T12:00:30+09:00",
      onTransition,
    )
    cancel()
    jest.advanceTimersByTime(60_000)
    expect(onTransition).not.toHaveBeenCalled()
    expect(jest.getTimerCount()).toBe(0)
  })

  it("값이 없으면 아무 것도 예약하지 않고, 취소 함수는 no-op 이다", () => {
    const onTransition = jest.fn()
    const cancel = scheduleNextTransition(null, onTransition)
    expect(jest.getTimerCount()).toBe(0)
    expect(() => cancel()).not.toThrow()
    jest.advanceTimersByTime(60_000)
    expect(onTransition).not.toHaveBeenCalled()
  })

  it("24.8일을 넘는 딜레이는 하루로 자른다 (setTimeout 32비트 오버플로)", () => {
    const onTransition = jest.fn()
    // 자르지 않으면 딜레이가 잘려 **즉시** 실행되고 무한 재예약 루프가 된다.
    const cancel = scheduleNextTransition(
      "2026-09-30T12:00:00+09:00",
      onTransition,
    )
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 - 1)
    expect(onTransition).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(onTransition).toHaveBeenCalledTimes(1)
    cancel()
  })
})

describe("요일", () => {
  it("월요일로 시작한다 — 서버 weekday() 와 같은 기준", () => {
    expect(WEEKDAY_ORDER).toEqual([
      "MON",
      "TUE",
      "WED",
      "THU",
      "FRI",
      "SAT",
      "SUN",
    ])
  })

  it("요일 키가 ko/en 둘 다에 있다", () => {
    for (const weekday of WEEKDAY_ORDER) {
      expect(hasCommonKeyInBothLocales(weekdayLabelKey(weekday))).toBe(true)
    }
  })
})
