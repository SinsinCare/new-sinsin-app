import {
  applyMealTypeChangeToMealImages,
  applyMealTypeChangeToRecordedMeals,
  getMealRecordStatusPresentation,
  getMealButtonAction,
  getMealTimeLabel,
  isSkippedDiet,
  toSkippedMealMap,
} from "../src/features/home/utils/mealRecordUtils"

describe("meal record utilities", () => {
  it("treats a skipped-only day as a recorded day even when streak is zero", () => {
    expect(
      getMealRecordStatusPresentation({
        hasRecord: true,
        streak: 0,
        isToday: true,
      }),
    ).toEqual({
      isRecorded: true,
      text: "오늘의 식이 기록을 남겼어요",
    })
  })

  it("uses the same unrecorded state for the icon and today's text", () => {
    expect(
      getMealRecordStatusPresentation({
        hasRecord: false,
        streak: 3,
        isToday: true,
      }),
    ).toEqual({
      isRecorded: false,
      text: "오늘은 식이 기록이 없어요",
    })
  })

  it("shows a streak only when the selected day is today and recorded", () => {
    expect(
      getMealRecordStatusPresentation({
        hasRecord: true,
        streak: 4,
        isToday: true,
      }),
    ).toEqual({
      isRecorded: true,
      text: "연속 4일 기록중",
    })
  })

  it("uses selected-date wording instead of today's streak for past dates", () => {
    expect(
      getMealRecordStatusPresentation({
        hasRecord: true,
        streak: 4,
        isToday: false,
      }),
    ).toEqual({
      isRecorded: true,
      text: "이날의 식이 기록을 남겼어요",
    })
  })

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

  it("shows skipped instead of the server-created time for skipped meals", () => {
    expect(getMealTimeLabel({ isSkipped: true, time: "오후 4:12" })).toBe(
      "건너뜀",
    )
    expect(getMealTimeLabel({ isSkipped: false, time: "오후 4:12" })).toBe(
      "오후 4:12",
    )
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

  it("moves a local meal image and explicitly clears the previous meal type", () => {
    expect(
      applyMealTypeChangeToMealImages({
        current: { DINNER: "file://dinner.jpg" },
        fromMealType: "DINNER",
        toMealType: "LUNCH",
        imageUri: "https://cdn.example.com/meal.jpg",
      }),
    ).toEqual({
      DINNER: null,
      LUNCH: "https://cdn.example.com/meal.jpg",
    })
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
