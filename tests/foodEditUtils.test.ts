import {
  applyOptimisticConsumption,
  buildFoodAnalysisUpdateRequest,
  validateMealTitle,
} from "../src/features/home/utils/foodEditUtils"
import type { FoodCameraAnalyzeResult } from "../src/types"

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

  it("optimistically scales v2 full nutrients without another analysis", () => {
    const nutrients = {
      calories: 200,
      protein: 10,
      carbohydrates: 20,
      fat: 4,
      sodium: 400,
      potassium: 300,
      phosphorus: 100,
      water: 50,
    }
    const result = {
      foodAnalysisResultId: 3,
      analysisId: "analysis-3",
      servings: 1,
      eatenPercentage: 100,
      title: "국",
      imageUrl: null,
      foods: [
        {
          analysisItemId: "item-3",
          name: "국",
          restrictionLevel: "",
          servingSizeValue: 200,
          servingSizeUnit: "g",
          ...nutrients,
        },
      ],
      total: nutrients,
      evaluation: {
        comment: "",
        score: 80,
        cautionFoods: [],
        detail: { riskFactors: "", disclaimer: "" },
      },
      revision: {
        revisionId: "revision-3",
        catalogSnapshotId: "catalog-3",
        policyVersion: "policy-3",
        nutritionFingerprint: "fingerprint-3",
        fullTotal: nutrients,
        evaluation: {
          comment: "",
          score: 80,
          cautionFoods: [],
          detail: { riskFactors: "", disclaimer: "" },
        },
        items: [
          {
            analysisItemId: "item-3",
            name: "국",
            analyzedGrams: 200,
            fullNutrients: nutrients,
            provenance: "CATALOG",
            confidence: 0.9,
          },
        ],
      },
    } satisfies FoodCameraAnalyzeResult

    const optimistic = applyOptimisticConsumption(result, 0.5)

    expect(optimistic.total.calories).toBe(100)
    expect(optimistic.total.sodium).toBe(200)
    expect(optimistic.foods[0].consumedGrams).toBe(100)
  })
})
