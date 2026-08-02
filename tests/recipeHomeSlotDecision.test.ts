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
  mealSlotStateBadgeKey,
  resolveSlotReasonCopy,
} from "../src/features/recipe/components/list/recipeHomePresentation"
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

  it("내일 아침 문장에는 치환할 끼니가 없다", () => {
    const copy = resolveSlotReasonCopy(
      decision({ reason: "NEXT_DAY", isNextDay: true }),
    )
    expect(copy?.mealSlot).toBeNull()
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
