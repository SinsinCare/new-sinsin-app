/**
 * "지금 어느 끼니를 먼저 보여 주는가" 의 **앱 쪽 몫**.
 *
 * 판정 자체는 서버가 한다(`sinsin-be-bun/src/domains/recipe/slotDecision.ts` — 개인
 * 식사시각 학습과 오늘의 기록/건너뜀). 앱이 책임지는 것은 셋뿐이고, 이 파일은 그 셋만 본다:
 *
 *  1. **서버가 안 보내도 화면이 죽지 않는다.** 새 필드(`slotDecision`·`section.state`)는
 *     아직 배포되지 않은 서버에서도 온다. 없을 때 **종전과 같은 화면**이 나와야 한다 —
 *     그러지 않으면 앱을 먼저 배포하는 순간 홈이 이상해진다.
 *
 *  2. **모르는 것을 지어내지 않는다.** 상태를 못 읽으면 `OPEN` 이다. `RECORDED` 로
 *     기울면 화면이 "아침을 기록했어요" 라고 **사용자가 하지 않은 일**을 사실로 말한다.
 *     반대 방향의 오류는 섹션이 앞에 남는 것뿐이라 사용자가 스스로 되돌린다.
 *
 *  3. **이유를 말할 때만 말한다.** 시계 그대로면 문장이 없다(`null`). 평소에 없던 줄이
 *     뜨는 것 자체가 "오늘은 뭔가 다르다" 의 신호이고, 늘 떠 있으면 그 신호가 죽는다.
 */
/* eslint-disable import/first -- 모의 스위치를 모듈 로드 전에 켜야 한다. */
jest.mock("../src/services/core/apiClient", () => ({ api: {} }))

process.env.EXPO_PUBLIC_RECIPE_V2_MOCK = "true"

import {
  buildMockRecipeHome,
  normalizeRecipeHomeResponse,
} from "../src/features/recipe/services/recipeHomeService"
import {
  mealSectionCopyKeys,
  mealSlotStateBadgeKey,
  resolveMealSectionBadgeKey,
  resolveMealSectionDay,
  resolveSlotReasonCopy,
} from "../src/features/recipe/components/list/recipeHomePresentation"
import enRecipe from "../src/i18n/locales/en/recipe.json"
import koRecipe from "../src/i18n/locales/ko/recipe.json"
import type {
  MealSlot,
  SlotDecision,
} from "../src/features/recipe/types/recipeHome"

/** KST 시각의 Date. 모의 서버는 KST 로 슬롯을 정한다. */
const kst = (hour: number): Date => new Date(Date.UTC(2026, 2, 11, hour - 9))

const decision = (over: Partial<SlotDecision> = {}): SlotDecision => ({
  slot: "LUNCH",
  reason: "CLOCK",
  clockSlot: "LUNCH",
  isNextDay: false,
  clockSource: "DEFAULT",
  ...over,
})

describe("서버가 새 필드를 안 보내도 종전 화면이 나온다", () => {
  const legacy = {
    budget: { sodiumMg: 1500 },
    currentSlot: "LUNCH",
    sections: [
      { slot: "LUNCH", items: [] },
      { slot: "DINNER", items: [] },
      { slot: "BREAKFAST", items: [] },
    ],
  }

  it("slotDecision 이 없으면 시계 그대로로 읽는다", () => {
    const home = normalizeRecipeHomeResponse(legacy)
    expect(home.slotDecision.slot).toBe("LUNCH")
    expect(home.slotDecision.reason).toBe("CLOCK")
    expect(home.slotDecision.clockSlot).toBe("LUNCH")
    expect(home.slotDecision.isNextDay).toBe(false)
    // 배우지 않은 것을 배웠다고 말하지 않는다.
    expect(home.slotDecision.clockSource).toBe("DEFAULT")
  })

  it("이유가 없으면 화면에 문장이 뜨지 않는다", () => {
    expect(
      resolveSlotReasonCopy(normalizeRecipeHomeResponse(legacy).slotDecision),
    ).toBeNull()
  })

  it("state 가 없으면 세 섹션 다 OPEN 이다 — 배지가 붙지 않는다", () => {
    for (const entry of normalizeRecipeHomeResponse(legacy).sections) {
      expect(entry.state).toBe("OPEN")
      expect(mealSlotStateBadgeKey(entry.state)).toBeNull()
    }
  })

  it("응답이 통째로 이상해도 세 섹션과 결정이 온다", () => {
    const home = normalizeRecipeHomeResponse({
      sections: "??",
      slotDecision: 7,
    })
    expect(home.sections).toHaveLength(3)
    expect(home.slotDecision.reason).toBe("CLOCK")
  })
})

describe("모르는 값을 지어내지 않는다", () => {
  it("모르는 state 는 OPEN 이다 (RECORDED 로 기울지 않는다)", () => {
    const home = normalizeRecipeHomeResponse({
      currentSlot: "LUNCH",
      sections: [{ slot: "LUNCH", state: "EATEN", items: [] }],
    })
    expect(home.sections.find((entry) => entry.slot === "LUNCH")?.state).toBe(
      "OPEN",
    )
  })

  it("모르는 reason 은 CLOCK 이다", () => {
    const home = normalizeRecipeHomeResponse({
      currentSlot: "DINNER",
      slotDecision: { slot: "DINNER", reason: "VIBES", clockSlot: "DINNER" },
      sections: [],
    })
    expect(home.slotDecision.reason).toBe("CLOCK")
  })

  it("서버가 준 state 는 그대로 읽는다", () => {
    const home = normalizeRecipeHomeResponse({
      currentSlot: "LUNCH",
      sections: [
        { slot: "LUNCH", state: "OPEN", items: [] },
        { slot: "BREAKFAST", state: "RECORDED", items: [] },
        { slot: "DINNER", state: "SKIPPED", items: [] },
      ],
    })
    const states = Object.fromEntries(
      home.sections.map((entry) => [entry.slot, entry.state]),
    )
    expect(states["BREAKFAST"]).toBe("RECORDED")
    expect(states["DINNER"]).toBe("SKIPPED")
  })
})

describe("이유 문장", () => {
  it("시계 그대로면 문장이 없다", () => {
    expect(resolveSlotReasonCopy(decision())).toBeNull()
    expect(resolveSlotReasonCopy(null)).toBeNull()
  })

  /**
   * 문장은 **원인이 된 끼니**를 말한다. 도착한 끼니를 말하면("점심부터 보여드려요")
   * 사용자는 왜 그런지 여전히 모른다.
   */
  it("전진했으면 원인이 된 끼니를 말한다", () => {
    const copy = resolveSlotReasonCopy(
      decision({
        slot: "LUNCH",
        reason: "AFTER_RECORD",
        clockSlot: "BREAKFAST",
      }),
    )
    expect(copy?.mealSlot).toBe("BREAKFAST")
    expect(copy?.key).toBe("home.reason.afterRecord")
  })

  it("건너뛴 것과 먹은 것은 다른 문장이다", () => {
    const record = resolveSlotReasonCopy(decision({ reason: "AFTER_RECORD" }))
    const skip = resolveSlotReasonCopy(decision({ reason: "AFTER_SKIP" }))
    expect(record?.key).not.toBe(skip?.key)
  })

  /**
   * 예전에는 여기에 "오늘 끼니를 다 기록했어요. 내일 아침부터 보여드려요" 가 있었고,
   * 두 줄 아래 제목은 "오늘의 아침 레시피" 였다 — **한 화면이 서로 다른 날을 말했다.**
   * 날은 이제 제목이 말하므로 이 줄은 같은 말의 두 번째 사본이 된다.
   */
  it("하루가 넘어간 것은 문장이 아니라 제목이 말한다", () => {
    expect(
      resolveSlotReasonCopy(decision({ reason: "NEXT_DAY", isNextDay: true })),
    ).toBeNull()
  })

  it("남은 두 문장은 언제나 원인 끼니를 말한다 — 치환이 빌 수 없다", () => {
    for (const reason of ["AFTER_RECORD", "AFTER_SKIP"] as const) {
      for (const clockSlot of ["BREAKFAST", "LUNCH", "DINNER"] as const) {
        const copy = resolveSlotReasonCopy(decision({ reason, clockSlot }))
        expect(copy?.mealSlot).toBe(clockSlot)
      }
    }
  })
})

/* ══════════════════ 제목이 말하는 날 = 실제로 보여 주는 날 ══════════════════ */

/**
 * 이번 결함 그 자체를 못 박는다.
 *
 * 판정(`SlotDecision`)과 문안(제목 문자열)은 **다른 파일에 산다.** 한쪽만 봐서는
 * "내일 아침을 오늘이라고 부르는" 상태를 잡을 수 없다 — 실제로 그 상태로 배포돼 있었다.
 * 그래서 두 쪽을 붙여 놓고, 어떤 판정에서도 어긋나지 않는지 본다.
 */
describe("어떤 판정에서도 제목의 날과 보여 주는 날이 같다", () => {
  const DAY_WORDS = {
    ko: { TODAY: /오늘/u, NEXT_DAY: /내일/u },
    en: { TODAY: /\btoday\b/iu, NEXT_DAY: /\btomorrow\b/iu },
  } as const

  /** 점 표기 키로 리소스에서 문자열을 꺼낸다. */
  function title(
    resource: typeof koRecipe,
    slot: MealSlot,
    day: "TODAY" | "NEXT_DAY",
  ): string {
    const leaf = mealSectionCopyKeys(slot, day).title.split(".").at(-1)
    const section = resource.home.section[
      slot.toLowerCase() as "breakfast" | "lunch" | "dinner"
    ] as Record<string, string>
    return section[leaf as string]
  }

  it("넘어간 슬롯만 내일이고, 나머지 두 섹션은 오늘이다", () => {
    const next = decision({
      slot: "BREAKFAST",
      reason: "NEXT_DAY",
      clockSlot: "DINNER",
      isNextDay: true,
    })
    expect(resolveMealSectionDay("BREAKFAST", next)).toBe("NEXT_DAY")
    // 이 둘에는 오늘의 `기록함`·`건너뜀` 배지가 붙는다 — 제목이 내일이면 배지와 어긋난다.
    expect(resolveMealSectionDay("LUNCH", next)).toBe("TODAY")
    expect(resolveMealSectionDay("DINNER", next)).toBe("TODAY")
  })

  it("하루가 안 넘어갔으면 세 섹션이 다 오늘이다", () => {
    for (const reason of ["CLOCK", "AFTER_RECORD", "AFTER_SKIP"] as const) {
      const today = decision({ reason, slot: "LUNCH", clockSlot: "BREAKFAST" })
      for (const slot of ["BREAKFAST", "LUNCH", "DINNER"] as const) {
        expect(resolveMealSectionDay(slot, today)).toBe("TODAY")
      }
    }
  })

  it("판정이 없으면 오늘이다 — 모르는 것을 내일이라고 하지 않는다", () => {
    for (const slot of ["BREAKFAST", "LUNCH", "DINNER"] as const) {
      expect(resolveMealSectionDay(slot, null)).toBe("TODAY")
    }
  })

  it("27가지 하루 × 세 시각 전부에서 제목이 판정과 어긋나지 않는다", () => {
    const ORIGINAL = process.env.EXPO_PUBLIC_RECIPE_HOME_MOCK_STATE
    const values = ["OPEN", "RECORDED", "SKIPPED"] as const
    let sawNextDay = false
    try {
      for (const b of values) {
        for (const l of values) {
          for (const d of values) {
            for (const hour of [9, 13, 19]) {
              process.env.EXPO_PUBLIC_RECIPE_HOME_MOCK_STATE = `BREAKFAST:${b},LUNCH:${l},DINNER:${d}`
              const home = buildMockRecipeHome(kst(hour))
              if (home.slotDecision.isNextDay) sawNextDay = true
              for (const section of home.sections) {
                const day = resolveMealSectionDay(
                  section.slot,
                  home.slotDecision,
                )
                /*
                  이 섹션이 내일인 것은 **판정이 그 슬롯을 내일이라고 했을 때뿐**이다.
                  제목 문자열이 그 판정과 같은 낱말을 쓰는지 두 언어로 확인한다.
                */
                expect(day).toBe(
                  home.slotDecision.isNextDay &&
                    home.slotDecision.slot === section.slot
                    ? "NEXT_DAY"
                    : "TODAY",
                )
                for (const [locale, resource] of [
                  ["ko", koRecipe],
                  ["en", enRecipe],
                ] as const) {
                  const text = title(resource, section.slot, day)
                  expect(text).toMatch(DAY_WORDS[locale][day])
                  expect(text).not.toMatch(
                    DAY_WORDS[locale][day === "TODAY" ? "NEXT_DAY" : "TODAY"],
                  )
                }
                /*
                  배지는 **오늘의** 사실이다(`기록함`·`건너뜀`). 내일이라고 말하는 섹션에
                  오늘의 배지가 붙으면 모순을 자리만 옮긴 것이 된다.
                */
                if (day === "NEXT_DAY") {
                  expect(
                    resolveMealSectionBadgeKey({ state: section.state, day }),
                  ).toBeNull()
                }
              }
              /*
                하루가 넘어간 날에는 이유 문장이 없다 — 제목이 이미 그 말을 했다.
                남아 있으면 사용자가 본 그 "있으나 없으나" 한 줄이 돌아온 것이다.
              */
              if (home.slotDecision.isNextDay) {
                expect(resolveSlotReasonCopy(home.slotDecision)).toBeNull()
              }
            }
          }
        }
      }
    } finally {
      if (ORIGINAL === undefined)
        delete process.env.EXPO_PUBLIC_RECIPE_HOME_MOCK_STATE
      else process.env.EXPO_PUBLIC_RECIPE_HOME_MOCK_STATE = ORIGINAL
    }
    // 넘어가는 날을 한 번도 못 밟았으면 위 반복 전체가 헛돈 것이다.
    expect(sawNextDay).toBe(true)
  })
})

describe("배지", () => {
  it("아직 안 먹은 끼니에는 배지가 없다", () => {
    expect(mealSlotStateBadgeKey("OPEN")).toBeNull()
  })

  it("끝난 두 상태는 서로 다른 배지다", () => {
    expect(mealSlotStateBadgeKey("RECORDED")).not.toBe(
      mealSlotStateBadgeKey("SKIPPED"),
    )
  })

  /**
   * `state` 는 **오늘** 그 끼니를 어떻게 했는가다. 세 끼를 다 기록한 밤에는 아침 슬롯의
   * 섹션이 "내일 아침" 을 말하게 되는데, 거기에 오늘의 `기록함` 이 그대로 붙으면 제목과
   * 배지가 서로 다른 날을 말한다 — 이번에 없앤 모순이 자리만 옮겨 되살아난다.
   */
  it("내일을 말하는 섹션에는 오늘의 배지가 붙지 않는다", () => {
    for (const state of ["OPEN", "RECORDED", "SKIPPED"] as const) {
      expect(resolveMealSectionBadgeKey({ state, day: "NEXT_DAY" })).toBeNull()
    }
  })

  it("오늘을 말하는 섹션의 배지는 종전 그대로다", () => {
    for (const state of ["OPEN", "RECORDED", "SKIPPED"] as const) {
      expect(resolveMealSectionBadgeKey({ state, day: "TODAY" })).toBe(
        mealSlotStateBadgeKey(state),
      )
    }
  })
})

/* ══════════════════════════ 모의 서버 ══════════════════════════ */

describe("모의 서버 — 미리보기에서 이 기능을 밟아 볼 수 있다", () => {
  const ORIGINAL = process.env.EXPO_PUBLIC_RECIPE_HOME_MOCK_STATE

  afterEach(() => {
    if (ORIGINAL === undefined)
      delete process.env.EXPO_PUBLIC_RECIPE_HOME_MOCK_STATE
    else process.env.EXPO_PUBLIC_RECIPE_HOME_MOCK_STATE = ORIGINAL
  })

  it("기록이 없으면 시계 그대로다", () => {
    delete process.env.EXPO_PUBLIC_RECIPE_HOME_MOCK_STATE
    const home = buildMockRecipeHome(kst(9))
    expect(home.currentSlot).toBe("BREAKFAST")
    expect(home.slotDecision.reason).toBe("CLOCK")
    expect(home.sections.map((entry) => entry.slot)).toEqual([
      "BREAKFAST",
      "LUNCH",
      "DINNER",
    ])
  })

  it("아침을 기록해 두면 09시에도 점심부터다", () => {
    process.env.EXPO_PUBLIC_RECIPE_HOME_MOCK_STATE = "BREAKFAST:RECORDED"
    const home = buildMockRecipeHome(kst(9))
    expect(home.currentSlot).toBe("LUNCH")
    expect(home.slotDecision.reason).toBe("AFTER_RECORD")
    // 끝난 끼니는 **사라지지 않고** 뒤로 간다.
    expect(home.sections.map((entry) => entry.slot)).toEqual([
      "LUNCH",
      "DINNER",
      "BREAKFAST",
    ])
    expect(home.sections.at(-1)?.state).toBe("RECORDED")
  })

  it("세 끼가 다 닫히면 내일 아침이다", () => {
    process.env.EXPO_PUBLIC_RECIPE_HOME_MOCK_STATE =
      "BREAKFAST:RECORDED,LUNCH:SKIPPED,DINNER:RECORDED"
    const home = buildMockRecipeHome(kst(19))
    expect(home.slotDecision.reason).toBe("NEXT_DAY")
    expect(home.slotDecision.isNextDay).toBe(true)
    // 세 섹션은 그대로 있다.
    expect(new Set(home.sections.map((entry) => entry.slot)).size).toBe(3)
  })

  /** 지나간 끼니로 돌아가지 않는다 — 서버와 같은 규칙. */
  it("저녁에 아침이 비어 있어도 아침으로 돌아가지 않는다", () => {
    process.env.EXPO_PUBLIC_RECIPE_HOME_MOCK_STATE = "DINNER:RECORDED"
    const home = buildMockRecipeHome(kst(19))
    expect(home.slotDecision.isNextDay).toBe(true)
    expect(home.slotDecision.clockSlot).toBe("DINNER")
  })

  it("이상한 스위치 값은 조용히 무시된다 — 미리보기가 화면을 죽이지 않는다", () => {
    process.env.EXPO_PUBLIC_RECIPE_HOME_MOCK_STATE = "브런치:먹음,,LUNCH"
    const home = buildMockRecipeHome(kst(9))
    expect(home.currentSlot).toBe("BREAKFAST")
    for (const entry of home.sections) expect(entry.state).toBe("OPEN")
  })

  it("어떤 스위치에서도 세 섹션이 정확히 한 번씩 온다", () => {
    const values = ["OPEN", "RECORDED", "SKIPPED"] as const
    const slots: MealSlot[] = ["BREAKFAST", "LUNCH", "DINNER"]
    for (const b of values) {
      for (const l of values) {
        for (const d of values) {
          process.env.EXPO_PUBLIC_RECIPE_HOME_MOCK_STATE = `BREAKFAST:${b},LUNCH:${l},DINNER:${d}`
          const home = buildMockRecipeHome(kst(13))
          expect(home.sections.map((entry) => entry.slot).sort()).toEqual(
            [...slots].sort(),
          )
        }
      }
    }
  })
})
