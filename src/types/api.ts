export interface FoodAnalysisRequest {
  imageBase64: string
  userId: string
}

export interface FoodAnalysisResponse {
  foods: AnalyzedFood[]
  totalNutrition: NutritionInfo
  kidneyAssessment: KidneyAssessment
}

export interface AnalyzedFood {
  name: string
  portion: string
  nutrition: NutritionInfo
  hasBroth: boolean
}

export interface NutritionInfo {
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  sodium: number
  potassium: number
  phosphorus: number
}

export interface KidneyAssessment {
  overallSafety: "safe" | "caution" | "warning"
  warnings: string[]
  recommendations: string[]
}

export interface ChatRequest {
  message: string
  conversationId?: string
  userId: string
  healthContext?: HealthContext
}

export interface HealthContext {
  ckdStage: number
  recentGfr?: number
  onDialysis: boolean
}

export interface ChatResponse {
  message: string
  conversationId: string
}
