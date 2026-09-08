import { cardConcernNutrients } from "../src/features/restaurant/utils/cardSafetyBadge"
import type { RestaurantSafetyDto } from "../src/features/restaurant/types"

function safety(over: Partial<RestaurantSafetyDto> = {}): RestaurantSafetyDto {
  return {
    level: "RESTRICTED",
    menuCount: 2,
    safeMenuCount: 0,
    cautionMenuCount: 1,
    restrictedMenuCount: 1,
    unknownMenuCount: 0,
    hasSafeMenu: false,
    driverCounts: { sodium: 2 },
    profileMissing: false,
    ...over,
  }
}

describe("all evidenced restaurant nutrient badges", () => {
  it("shows all four concerns in a stable order instead of only the dominant driver", () => {
    expect(
      cardConcernNutrients(
        safety({
          concernCounts: { protein: 1, phosphorus: 2, sodium: 2, potassium: 1 },
        }),
      ),
    ).toEqual(["sodium", "potassium", "phosphorus", "protein"])
  })

  it("does not hide menu concerns when the restaurant rollup is SAFE", () => {
    expect(
      cardConcernNutrients(
        safety({
          level: "SAFE",
          safeMenuCount: 3,
          hasSafeMenu: true,
          concernCounts: { phosphorus: 1 },
        }),
      ),
    ).toEqual(["phosphorus"])
  })

  it("uses only finite positive counts, and does not fabricate unsupported nutrients", () => {
    expect(
      cardConcernNutrients(
        safety({
          concernCounts: {
            sodium: 0,
            potassium: -1,
            phosphorus: Number.NaN,
            protein: Number.POSITIVE_INFINITY,
          },
        }),
      ),
    ).toEqual([])
  })

  it("supports older responses while respecting an explicitly empty new count map", () => {
    expect(
      cardConcernNutrients(safety({ driverCounts: { sodium: 2, protein: 1 } })),
    ).toEqual(["sodium", "protein"])
    expect(cardConcernNutrients(safety({ concernCounts: {} }))).toEqual([])
  })

  it("hides claims when the profile or verdict is unavailable", () => {
    expect(cardConcernNutrients(null)).toEqual([])
    expect(cardConcernNutrients(undefined)).toEqual([])
    expect(
      cardConcernNutrients(
        safety({ profileMissing: true, concernCounts: { sodium: 2 } }),
      ),
    ).toEqual([])
    expect(
      cardConcernNutrients(
        safety({ level: "UNKNOWN", concernCounts: { sodium: 2 } }),
      ),
    ).toEqual([])
  })
})
