import {
  applyOptimisticConsumption,
  buildFoodAnalysisUpdateRequest,
  getAutoTitleForFoodCorrection,
  validateMenuAmount,
  validateMenuName,
  validateMealTitle,
} from "../src/features/home/utils/foodEditUtils"
import { EATEN_PRESETS } from "../src/features/home/data/foodEditConstants"
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

  it("includes an automatic title with a corrected single-food request", () => {
    expect(
      buildFoodAnalysisUpdateRequest({
        title: " 멜론 ",
        servings: 1,
        eatenPercentage: 100,
        foods: [{ id: 10, name: "멜론", amount: "1", unit: "개" }],
      }),
    ).toMatchObject({ title: "멜론" })
  })

  it("updates only a single-food title that still matches the AI-generated name", () => {
    const singleFood = {
      foodAnalysisResultId: 3,
      title: "참외",
      servings: 1,
      eatenPercentage: 100,
      imageUrl: null,
      foods: [
        {
          id: 10,
          name: "참외",
          restrictionLevel: "SAFE",
          servingSizeValue: 1,
          servingSizeUnit: "개",
          calories: 0,
          protein: 0,
          carbohydrates: 0,
          fat: 0,
          sodium: 0,
          potassium: 0,
          phosphorus: 0,
          water: 0,
        },
      ],
      total: {
        calories: 0,
        protein: 0,
        carbohydrates: 0,
        fat: 0,
        sodium: 0,
        potassium: 0,
        phosphorus: 0,
        water: 0,
      },
      evaluation: {
        comment: "",
        score: 0,
        cautionFoods: [],
        detail: { riskFactors: "", disclaimer: "" },
      },
    } satisfies FoodCameraAnalyzeResult

    expect(
      getAutoTitleForFoodCorrection(singleFood, [
        { id: 10, name: "멜론", amount: "1", unit: "개" },
      ]),
    ).toBe("멜론")
    expect(
      getAutoTitleForFoodCorrection({ ...singleFood, title: "여름 과일" }, [
        { id: 10, name: "멜론", amount: "1", unit: "개" },
      ]),
    ).toBeUndefined()
  })

  it("defines four explicit consumed amount presets", () => {
    expect(EATEN_PRESETS).toEqual([
      { step: 0, percentage: 25, label: "25%", description: "조금" },
      { step: 1, percentage: 50, label: "50%", description: "절반" },
      { step: 2, percentage: 75, label: "75%", description: "대부분" },
      { step: 3, percentage: 100, label: "100%", description: "전부" },
    ])
  })

  it("rejects blank menu names", () => {
    expect(validateMenuName("   ")).toEqual({
      isValid: false,
      message: "메뉴 이름을 입력해 주세요",
    })
  })

  it.each(["", "0", "-1", "abc", "1인분"])(
    "rejects an invalid menu amount: %s",
    (amount) => {
      expect(validateMenuAmount(amount).isValid).toBe(false)
    },
  )

  it.each(["0.5", "1", "120.5"])(
    "accepts a positive numeric menu amount: %s",
    (amount) => {
      expect(validateMenuAmount(amount)).toEqual({
        isValid: true,
        message: "",
      })
    },
  )

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
