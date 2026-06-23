import {
  buildFoodAnalysisUpdateRequest,
  validateMealTitle,
} from "../src/features/home/utils/foodEditUtils"

describe("food edit utilities", () => {
  it("rejects blank meal titles with the server-facing message", () => {
    expect(validateMealTitle("   ")).toEqual({
      isValid: false,
      message: "식단 이름을 입력해주세요",
    })
  })

  it("normalizes inline-edited food names into the update body", () => {
    expect(
      buildFoodAnalysisUpdateRequest({
        servings: 1,
        eatenPercentage: 75,
        foods: [
          {
            id: 10,
            name: " 수정된 음식명 ",
            amount: "0.5",
            unit: "인분",
          },
        ],
      }),
    ).toEqual({
      servings: 1,
      eatenPercentage: 75,
      foods: [
        {
          foodId: 10,
          name: "수정된 음식명",
          servingSizeValue: 0.5,
          servingSizeUnit: "인분",
        },
      ],
    })
  })
})
