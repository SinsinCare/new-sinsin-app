import {
  applyMealTypeChangeToRecordedMeals,
  isSkippedDiet,
  toSkippedMealMap,
} from "../src/features/home/utils/mealRecordUtils"

describe("meal record utilities", () => {
  it("maps skipped diets by meal type", () => {
    expect(
      toSkippedMealMap([
        {
          diaryId: null,
          mealType: "BREAKFAST",
          createdAt: "2026-06-23T00:00:00",
          imageUrl: null,
          isSkipped: true,
        },
        {
          diaryId: 10,
          mealType: "LUNCH",
          createdAt: "2026-06-23T01:00:00",
          imageUrl: null,
          isSkipped: false,
        },
      ]),
    ).toEqual({ BREAKFAST: true })
  })

  it("treats null diary ids as skipped diets even without the flag", () => {
    expect(
      isSkippedDiet({
        diaryId: null,
        mealType: "DINNER",
        createdAt: "2026-06-23T02:00:00",
        imageUrl: null,
      }),
    ).toBe(true)
  })

  it("moves recorded meal state and explicitly unrecords the previous meal type", () => {
    expect(
      applyMealTypeChangeToRecordedMeals({
        current: { DINNER: true },
        fromMealType: "DINNER",
        toMealType: "LUNCH",
      }),
    ).toEqual({
      DINNER: false,
      LUNCH: true,
    })
  })
})
