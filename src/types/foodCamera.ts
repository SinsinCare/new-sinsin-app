export interface FoodCameraFood {
  name: string
  restrictionLevel: string
  servingSize: string
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  sodium: number
  potassium: number
  phosphorus: number
  water: number
}

export interface FoodCameraNutritionTotal {
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  sodium: number
  potassium: number
  phosphorus: number
  water: number
}

export interface FoodCameraCautionFood {
  food: string
  reason: string
}

export interface FoodCameraEvaluation {
  comment: string
  score: number
  cautionFoods: FoodCameraCautionFood[]
  detail: {
    riskFactors: string
    disclaimer: string
  }
}

export interface FoodCameraAnalyzeResult {
  foodAnalysisResultId: number
  servings: number
  eatenPercentage: number
  foods: FoodCameraFood[]
  total: FoodCameraNutritionTotal
  evaluation: FoodCameraEvaluation
}

export interface FoodCameraDiaryRegisterResponse {
  isSuccess: boolean
  code: string
  message: string
  timestamp: string
}
