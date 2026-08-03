import { inferGlucoseContext } from "../src/features/home/utils/glucoseInference"
import type { DateAnalysisDiet } from "../src/types"

/** 서버 표기(naive UTC, "Z" 없음)로 만든 끼니 기록. */
function dietAt(
  at: Date,
  mealType: DateAnalysisDiet["mealType"],
  extra?: Partial<DateAnalysisDiet>,
): DateAnalysisDiet {
  return {
    diaryId: 1,
    mealType,
    createdAt: at.toISOString().replace("Z", ""),
    imageUrl: null,
    ...extra,
  }
}

function localTime(at: Date): string {
  return `${String(at.getHours()).padStart(2, "0")}:${String(
    at.getMinutes(),
  ).padStart(2, "0")}`
}

describe("glucose context inference", () => {
  const now = new Date(2026, 7, 3, 11, 12) // 현지 11:12

  it("infers after-meal with elapsed bucket from the latest meal", () => {
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const result = inferGlucoseContext({
      diets: [dietAt(twoHoursAgo, "BREAKFAST")],
      now,
    })
    expect(result).toEqual({
      timing: "AFTER_MEAL",
      elapsed: "2H",
      mealType: "BREAKFAST",
      mealTime: localTime(twoHoursAgo),
    })
  })

  it.each([
    [20, "30M"],
    [60, "1H"],
    [150, "2H"],
  ] as const)("maps %s minutes since eating to %s", (minutes, expected) => {
    const eatenAt = new Date(now.getTime() - minutes * 60 * 1000)
    const result = inferGlucoseContext({
      diets: [dietAt(eatenAt, "LUNCH")],
      now,
    })
    expect(result?.elapsed).toBe(expected)
  })

  it("uses the most recent meal when several exist", () => {
    const breakfast = new Date(now.getTime() - 4 * 60 * 60 * 1000)
    const lunch = new Date(now.getTime() - 1 * 60 * 60 * 1000)
    const result = inferGlucoseContext({
      diets: [dietAt(breakfast, "BREAKFAST"), dietAt(lunch, "LUNCH")],
      now,
    })
    expect(result?.mealType).toBe("LUNCH")
    expect(result?.elapsed).toBe("1H")
  })

  it("does not guess when the last meal is older than six hours", () => {
    const sevenHoursAgo = new Date(now.getTime() - 7 * 60 * 60 * 1000)
    expect(
      inferGlucoseContext({ diets: [dietAt(sevenHoursAgo, "BREAKFAST")], now }),
    ).toBeNull()
  })

  it("ignores skipped meals", () => {
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const result = inferGlucoseContext({
      diets: [dietAt(oneHourAgo, "BREAKFAST", { isSkipped: true })],
      now: new Date(2026, 7, 3, 14, 0),
    })
    expect(result).toBeNull()
  })

  it("infers fasting on a meal-less morning, but not in the afternoon", () => {
    const morning = new Date(2026, 7, 3, 8, 30)
    expect(inferGlucoseContext({ diets: [], now: morning })).toEqual({
      timing: "FASTING",
      elapsed: null,
      mealType: null,
      mealTime: null,
    })
    const afternoon = new Date(2026, 7, 3, 14, 0)
    expect(inferGlucoseContext({ diets: [], now: afternoon })).toBeNull()
  })
})
