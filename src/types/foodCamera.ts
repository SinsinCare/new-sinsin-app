import { EdemaLevel, MealType } from "../features/home/types"

export interface FoodCameraFood {
  id?: number
  name: string
  restrictionLevel: string
  servingSizeValue: number | null
  servingSizeUnit: string
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

export interface DiaryAnalysisResult extends FoodCameraAnalyzeResult {
  imageUrl: string
}

export interface DiaryAnalysisResponse {
  isSuccess: boolean
  code: string
  message: string
  result: DiaryAnalysisResult
  timestamp: string
}

export interface FoodCameraDiaryRegisterResponse {
  isSuccess: boolean
  code: string
  message: string
  timestamp: string
}

export interface DateAnalysisDiet {
  diaryId: number
  mealType: MealType
  createdAt: string
  imageUrl: string
}

export interface DateAnalysisBodyRecord {
  weightKg: number
  edemaLevel: EdemaLevel
  recordDate: string
}

export interface DateAnalysis {
  protein: number
  sodium: number
  potassium: number
  phosphorus: number
  water: number
  extraWater: number
  dietaryGuide: string
  cautionFoods: string[]
}

export interface DateAnalysisResult {
  analysis: DateAnalysis | null
  diets: DateAnalysisDiet[]
  bodyRecords: {
    today: DateAnalysisBodyRecord | null
    previous: DateAnalysisBodyRecord | null
  }
}

export interface DateAnalysisResponse {
  isSuccess: boolean
  code: string
  message: string
  result: DateAnalysisResult
  timestamp: string
}

export interface DiaryExistenceItem {
  date: string
  exists: boolean
}

export interface DiaryExistenceResponse {
  isSuccess: boolean
  code: string
  message: string
  result: DiaryExistenceItem[]
  timestamp: string
}

export interface ExtraWaterUpdateItem {
  extraWater: number
}

export interface ExtraWaterUpdateResponse {
  isSuccess: boolean
  code: string
  message: string
  result: ExtraWaterUpdateItem
  timestamp: string
}
