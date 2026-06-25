import {
  clampWaterIntake,
  getAppliedWaterDelta,
} from "../src/features/home/utils/waterIntake"

describe("water intake policy", () => {
  it("caps water intake at 6000ml", () => {
    expect(clampWaterIntake(6300)).toBe(6000)
    expect(clampWaterIntake(-100)).toBe(0)
  })

  it("returns only the actually applied water delta", () => {
    expect(getAppliedWaterDelta(5800, 500)).toBe(200)
    expect(getAppliedWaterDelta(6000, 50)).toBe(0)
    expect(getAppliedWaterDelta(200, -500)).toBe(-200)
  })
})
