import { EdemaLevel, MealType } from "../features/home/types"

export interface FoodCameraFood {
  id?: number
  analysisItemId?: string
  canonicalFoodId?: string | null
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
  analyzedGrams?: number | null
  consumedGrams?: number | null
  confidence?: number | null
  provenance?: FoodNutritionProvenance
  isBroth?: boolean
}

export type FoodAnalysisStatus =
  | "QUEUED"
  | "PERCEIVING"
  | "RESOLVING"
  | "NEEDS_CONFIRMATION"
  | "READY"
  | "FAILED"

export type FoodNutritionProvenance =
  | "CATALOG"
  | "RECIPE"
  | "INGREDIENT_ESTIMATE"
  | "AI_ESTIMATE"

export interface FoodAnalysisCoverage {
  catalog?: number
  recipe?: number
  ingredientEstimate?: number
  unresolved?: number
}

export interface FoodAnalysisConfirmationOption {
  value: string
  label: string
  canonicalFoodId?: string
  analyzedGrams?: number
}

export interface FoodAnalysisConfirmationQuestion {
  questionId: string
  type: "FOOD_MATCH" | "PORTION" | "INGREDIENT" | "BROTH_RATIO"
  observationItemId?: string | null
  prompt: string
  options: FoodAnalysisConfirmationOption[]
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
  analysisId?: string
  requestId?: string
  status?: FoodAnalysisStatus
  revisionId?: string
  catalogSnapshotId?: string
  policyVersion?: string
  coverage?: FoodAnalysisCoverage
  revision?: FoodAnalysisRevision
  consumptionRevision?: FoodAnalysisConsumptionRevision | null
  servings: number
  eatenPercentage: number
  consumedRatio?: number
  solidConsumedRatio?: number
  brothConsumedRatio?: number
  title: string
  imageUrl: string | null
  foods: FoodCameraFood[]
  total: FoodCameraNutritionTotal
  evaluation: FoodCameraEvaluation
}

export interface FoodAnalysisRevisionItem {
  analysisItemId: string
  canonicalFoodId?: string | null
  name: string
  analyzedGrams: number
  fullNutrients: FoodCameraNutritionTotal
  provenance: FoodNutritionProvenance
  confidence: number
}

export interface FoodAnalysisRevision {
  revisionId: string
  catalogSnapshotId: string
  policyVersion: string
  nutritionFingerprint: string
  fullTotal: FoodCameraNutritionTotal
  totals?: FoodCameraNutritionTotal
  coverage?: FoodAnalysisCoverage
  evaluation: FoodCameraEvaluation
  items: FoodAnalysisRevisionItem[]
}

export interface FoodAnalysisConsumptionRevision {
  consumptionRevisionId: string
  baseRevisionId: string
  items: (FoodAnalysisConsumptionItem & {
    nutrients: FoodCameraNutritionTotal
  })[]
  consumedTotal: FoodCameraNutritionTotal
  totals?: FoodCameraNutritionTotal
  coverage?: FoodAnalysisCoverage
  evaluation: FoodCameraEvaluation
}

export interface FoodAnalysisJob {
  analysisId: string
  requestId: string
  status: FoodAnalysisStatus
  pollAfterMs?: number
  result?: FoodCameraAnalyzeResult | null
  confirmationQuestions?: FoodAnalysisConfirmationQuestion[]
  failureMessage?: string | null
}

export interface FoodAnalysisConsumptionItem {
  analysisItemId: string
  consumedGrams?: number
  consumedRatio?: number
  solidConsumedRatio?: number
  brothConsumedRatio?: number
}

export interface FoodAnalysisConsumptionRequest {
  consumedRatio?: number
  solidConsumedRatio?: number
  brothConsumedRatio?: number
  items?: FoodAnalysisConsumptionItem[]
}

export interface FoodAnalysisConfirmationRequest {
  items: {
    observationItemId?: string
    canonicalFoodId: string
    analyzedGrams: number
    confidence?: number
    ingredientOverrides?: Record<string, number>
    preparationModifiers?: string[]
  }[]
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
  diaryId: number | null
  mealType: MealType
  createdAt: string
  imageUrl: string | null
  isSkipped?: boolean
}

export interface DateAnalysisBodyRecord {
  weightKg: number
  edemaLevel: EdemaLevel
  recordDate: string
}

export interface DateAnalysisBloodPressureRecord {
  systolic: number
  diastolic: number
  heartRate: number | null
  recordDate: string
}

export interface DateAnalysisBloodGlucoseRecord {
  value: number
  timing: "FASTING" | "BEFORE_MEAL" | "AFTER_MEAL"
  elapsed: "30M" | "1H" | "2H" | null
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
  bloodPressure: DateAnalysisBloodPressureRecord | null
  bloodGlucose: DateAnalysisBloodGlucoseRecord[]
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

export interface FoodAnalysisUpdateFoodItem {
  foodId?: number
  name: string
  servingSizeValue: number
  servingSizeUnit: string
}

export interface FoodAnalysisUpdateRequest {
  servings: number
  eatenPercentage: number
  consumedRatio?: number
  solidConsumedRatio?: number
  brothConsumedRatio?: number
  foods: FoodAnalysisUpdateFoodItem[]
}

export interface FoodAnalysisUpdateResult extends FoodCameraAnalyzeResult {
  imageUrl: string | null
}

export interface FoodAnalysisUpdateResponse {
  isSuccess: boolean
  code: string
  message: string
  result: FoodAnalysisUpdateResult
  timestamp: string
}

export interface FoodTitleUpdateResponse {
  isSuccess: boolean
  code: string
  message: string
  result: FoodTitleUpdateResult
  timestamp: string
}

export interface FoodTitleUpdateResult {
  foodAnalysisResultId: number
  title: string
}
