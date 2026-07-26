import type { DateAnalysisResponse, FoodCameraAnalyzeResult } from "@/src/types"

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
    comment: "나트륨 섭취가 높은 편이에요. 국물 섭취를 줄여보세요.",
    score: 72,
    cautionFoods: [
      {
        food: "김치찌개",
        reason: "나트륨이 높습니다.",
      },
    ],
    detail: {
      riskFactors: "고나트륨 섭취",
      disclaimer: "본 결과는 참고용이며, 의학적 진단이 아닙니다.",
    },
  },
}

const MOCK_DATE_ANALYSIS_RESPONSE: DateAnalysisResponse = {
  isSuccess: true,
  code: "SUCCESS",
  message: "Mock date analysis loaded.",
  timestamp: "2026-01-01T00:00:00.000Z",
  result: {
    analysis: {
      protein: 0,
      sodium: 0,
      potassium: 0,
      phosphorus: 0,
      water: 0,
      extraWater: 0,
      dietaryGuide: "기록된 식단이 없어요.",
      cautionFoods: [],
    },
    diets: [],
    bodyRecords: { today: null, previous: null },
    bloodPressure: null,
    bloodGlucose: [],
  },
}

export const mockFoodCameraService = {
  async analyze(): Promise<FoodCameraAnalyzeResult> {
    await delay(1500)
    return MOCK_FOOD_CAMERA_RESULT
  },

  async fetchDateAnalysis(): Promise<DateAnalysisResponse> {
    return MOCK_DATE_ANALYSIS_RESPONSE
  },
}
