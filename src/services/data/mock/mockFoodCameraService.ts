import type { FoodCameraAnalyzeResult } from "@/src/types"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const MOCK_FOOD_CAMERA_RESULT: FoodCameraAnalyzeResult = {
  foodAnalysisResultId: 1,
  servings: 1,
  eatenPercentage: 100,
  title: "김치찌개",
  imageUrl: null,
  foods: [
    {
      name: "김치찌개",
      restrictionLevel: "MODERATE",
      servingSizeValue: null,
      servingSizeUnit: "1인분",
      calories: 350,
      protein: 18,
      carbohydrates: 20,
      fat: 22,
      sodium: 1200,
      potassium: 500,
      phosphorus: 250,
      water: 300,
    },
  ],
  total: {
    calories: 350,
    protein: 18,
    carbohydrates: 20,
    fat: 22,
    sodium: 1200,
    potassium: 500,
    phosphorus: 250,
    water: 300,
  },
  evaluation: {
    comment: "나트륨이 많은 식사예요. 국물은 덜 먹어 보세요.",
    score: 72,
    cautionFoods: [
      {
        food: "김치찌개",
        reason: "나트륨이 많아요.",
      },
    ],
    detail: {
      riskFactors: "나트륨 섭취량이 많음",
      disclaimer: "이 결과는 참고용이에요. 의학적 진단을 대신하지 않아요.",
    },
  },
}

export const mockFoodCameraService = {
  async analyze(): Promise<FoodCameraAnalyzeResult> {
    await delay(1500)
    return MOCK_FOOD_CAMERA_RESULT
  },
}
