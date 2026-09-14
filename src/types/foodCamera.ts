import type { EdemaObservation } from "@/src/features/home/utils/edemaEntry"
import { EdemaLevel, MealType } from "../features/home/types"

export interface FoodCameraFood {
  id?: number
  analysisItemId?: string
  canonicalFoodId?: string | null
  name: string
  restrictionLevel: string
  /** 서버 영양 상태. `PENDING` 은 식품표에 못 이은 항목 — 값이 null 이고 합계에서 빠진다. */
  nutritionStatus?: "OK" | "PENDING" | string
  servingSizeValue: number | null
  servingSizeUnit: string
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  sodium: number | null
  potassium: number | null
  phosphorus: number | null
  water: number | null
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
  sodium: number | null
  potassium: number | null
  phosphorus: number | null
  water: number | null
}

export interface FoodCameraCautionFood {
  food: string
  reason: string
}

export interface FoodCameraEvaluation {
  comment: string
  score: number | null
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
  /** 서버가 삽화를 미루고 먼저 돌려줬다(2026-09-11). true 면 결과 화면이 몇 초 간격으로 다시 읽어 그림을 갈아 끼운다. */
  illustrationPending?: boolean
  foods: FoodCameraFood[]
  total: FoodCameraNutritionTotal
  evaluation: FoodCameraEvaluation
  /** 레시피에서 옮겨 적은 분석(`from-recipe`). */
  recipeId?: number
  /** 식품표에 대조하지 못해 총량에서 빠진 재료 이름. */
  unmatchedIngredients?: string[]
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
  presentationLocale?: "ko" | "en"
  pollAfterMs?: number
  result?: FoodCameraAnalyzeResult | null
  confirmationQuestions?: FoodAnalysisConfirmationQuestion[]
  error?: string | null
  /** @deprecated Transitional alias for pre-contract clients. */
  failureMessage?: string | null
}

export type FoodAnalysisMode = "PRE_MEAL" | "POST_MEAL"

export interface FoodAnalysisConsumptionItem {
  analysisItemId: string
  consumedGrams?: number
  consumedRatio?: number
  solidConsumedRatio?: number
  brothConsumedRatio?: number
}

export interface FoodAnalysisConsumptionRequest {
  baseRevisionId: string
  baseConsumptionRevisionId?: string
  items: FoodAnalysisConsumptionItem[]
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
  /** 분석 제목(첫 음식 이름 폴백). 건너뛴 끼니는 null. */
  title?: string | null
  /** 이 기록의 열량(kcal, 반올림). 서버 2026-09-04 부터 실린다 — 목록이 다이어리마다 다시 받지 않게. */
  calories?: number | null
  createdAt: string
  imageUrl: string | null
  isSkipped?: boolean
}

/** 약 복용 하루 요약(서버 2026-09-04). 일정이 없으면 planned 0. */
export interface DateAnalysisMedication {
  taken: number
  planned: number
}

export interface DateAnalysisBodyRecord {
  weightKg: number
  edemaLevel: EdemaLevel
  edemaObservations?: EdemaObservation[]
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
  /**
   * 끼니 축(서버 마이그레이션 081). `""` 는 공복이거나 "모름"이다 —
   * 축이 생기기 전 기록과 구버전 앱이 남긴 기록. 구서버 응답에는 이 키가 아예 없다.
   */
  slot?: "BREAKFAST" | "LUNCH" | "DINNER" | ""
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
  /** 구서버 응답에는 없다 — 없으면 타일은 "기록 없음". */
  medication?: DateAnalysisMedication | null
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
