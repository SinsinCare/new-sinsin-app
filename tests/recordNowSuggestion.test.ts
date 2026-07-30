import { getGlucoseNowSuggestion } from "@/src/features/home/utils/recordNowSuggestion"
import type {
  DateAnalysisBloodGlucoseRecord,
  DateAnalysisDiet,
} from "@/src/types"

const breakfastAt = (createdAt: string): DateAnalysisDiet => ({
  diaryId: 1,
  mealType: "BREAKFAST",
  createdAt,
  imageUrl: null,
})

const glucose = (
  timing: DateAnalysisBloodGlucoseRecord["timing"],
): DateAnalysisBloodGlucoseRecord => ({
  value: 120,
  timing,
  elapsed: timing === "AFTER_MEAL" ? "2H" : null,
  recordDate: "2026-07-26",
})

// 아침 08:00(UTC 기준 naive 문자열) — 서버 createdAt 형식.
const BREAKFAST_0800 = "2026-07-26T08:00:00"
const at = (iso: string) => new Date(iso)

describe("getGlucoseNowSuggestion — 아침 식후 2시간 창", () => {
  it("아침 기록 2시간 뒤부터 지금이라고 알린다", () => {
    const result = getGlucoseNowSuggestion({
      diets: [breakfastAt(BREAKFAST_0800)],
      bloodGlucose: [],
      now: at("2026-07-26T10:12:00Z"),
    })
    expect(result.highlight).toBe(true)
    expect(result.caption).toBe("아침 식사 후 혈당을 잴 때예요")
  })

  it("2시간이 되기 전에는 조르지 않는다", () => {
    const result = getGlucoseNowSuggestion({
      diets: [breakfastAt(BREAKFAST_0800)],
      bloodGlucose: [],
      now: at("2026-07-26T09:00:00Z"),
    })
    expect(result.highlight).toBe(false)
  })

  it("6시간이 지나면 창을 닫는다 — 이미 다음 끼니 시간이다", () => {
    const result = getGlucoseNowSuggestion({
      diets: [breakfastAt(BREAKFAST_0800)],
      bloodGlucose: [],
      now: at("2026-07-26T15:00:00Z"),
    })
    expect(result.highlight).toBe(false)
  })

  it("오늘 식후 혈당이 이미 있으면 알리지 않는다", () => {
    const result = getGlucoseNowSuggestion({
      diets: [breakfastAt(BREAKFAST_0800)],
      bloodGlucose: [glucose("AFTER_MEAL")],
      now: at("2026-07-26T10:30:00Z"),
    })
    expect(result.highlight).toBe(false)
  })

  it("공복·식전 기록만 있으면 여전히 알린다", () => {
    const result = getGlucoseNowSuggestion({
      diets: [breakfastAt(BREAKFAST_0800)],
      bloodGlucose: [glucose("FASTING")],
      now: at("2026-07-26T10:30:00Z"),
    })
    expect(result.highlight).toBe(true)
  })

  it("아침이 없거나 건너뛴 날은 알리지 않는다", () => {
    expect(
      getGlucoseNowSuggestion({
        diets: [],
        bloodGlucose: [],
        now: at("2026-07-26T10:30:00Z"),
      }).highlight,
    ).toBe(false)

    expect(
      getGlucoseNowSuggestion({
        diets: [{ ...breakfastAt(BREAKFAST_0800), isSkipped: true }],
        bloodGlucose: [],
        now: at("2026-07-26T10:30:00Z"),
      }).highlight,
    ).toBe(false)
  })
})
