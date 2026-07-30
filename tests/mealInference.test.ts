import { inferMealTypeFromTime } from "@/src/features/home/utils/mealRecordUtils"

const at = (h: number, m = 0) => {
  const d = new Date(2026, 6, 26)
  d.setHours(h, m, 0, 0)
  return d
}

describe("inferMealTypeFromTime — 지금 시각으로 끼니 채우기", () => {
  it("새벽·아침은 아침으로", () => {
    expect(inferMealTypeFromTime(at(6))).toBe("BREAKFAST")
    expect(inferMealTypeFromTime(at(10, 29))).toBe("BREAKFAST")
  })

  it("낮은 점심으로", () => {
    expect(inferMealTypeFromTime(at(10, 30))).toBe("LUNCH")
    expect(inferMealTypeFromTime(at(14, 59))).toBe("LUNCH")
  })

  it("저녁 시간대는 저녁으로", () => {
    expect(inferMealTypeFromTime(at(15))).toBe("DINNER")
    expect(inferMealTypeFromTime(at(20, 59))).toBe("DINNER")
  })

  it("늦은 밤은 간식으로", () => {
    expect(inferMealTypeFromTime(at(21))).toBe("SNACKS")
    expect(inferMealTypeFromTime(at(23, 59))).toBe("SNACKS")
  })
})
