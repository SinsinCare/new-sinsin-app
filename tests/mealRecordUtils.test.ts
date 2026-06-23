import {
  getMealButtonAction,
  isSkippedDiet,
  toSkippedMealMap,
} from "../src/features/home/utils/mealRecordUtils"

describe("meal record utilities", () => {
  it("opens the record flow instead of diary detail for skipped meals", () => {
    expect(
      getMealButtonAction({
        isRecorded: true,
        isSkipped: true,
      }),
    ).toBe("record")
  })

  it("opens diary detail only for real recorded meals", () => {
    expect(
      getMealButtonAction({
        isRecorded: true,
        isSkipped: false,
      }),
    ).toBe("view")
  })

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
})
