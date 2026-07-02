import {
  clampWaterIntake,
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
})
