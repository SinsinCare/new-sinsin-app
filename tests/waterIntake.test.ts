import {
  clampWaterIntake,
  displayedWaterIntake,
  getAppliedWaterDelta,
} from "../src/features/home/utils/waterIntake"

describe("water intake policy", () => {
  it("does not cap positive water intake", () => {
    expect(clampWaterIntake(6300)).toBe(6300)
    expect(clampWaterIntake(12000)).toBe(12000)
    expect(clampWaterIntake(-100)).toBe(0)
  })

  it("returns the requested delta unless it would go below zero", () => {
    expect(getAppliedWaterDelta(5800, 500)).toBe(500)
    expect(getAppliedWaterDelta(6000, 50)).toBe(50)
    expect(getAppliedWaterDelta(200, -500)).toBe(-200)
  })

  /**
   * 홈 타일·물 시트가 그리는 숫자는 사용자가 적은 물이어야 한다. 음식 수분을 더하면
   * (a) 시트가 편집하는 값(extraWater)과 화면의 큰 숫자가 어긋나고 (b) 끼니 재집계가
   * 끝나는 순간 물을 마시지 않았는데 숫자가 혼자 늘어난다(2026-08-19 신고).
   */
  it("shows only the water the user logged, never the water in food", () => {
    expect(displayedWaterIntake({ water: 905, extraWater: 168 })).toBe(168)
    expect(displayedWaterIntake({ water: 905, extraWater: 0 })).toBe(0)
    expect(displayedWaterIntake({ water: null, extraWater: null })).toBe(0)
    expect(displayedWaterIntake(null)).toBe(0)
  })
})
