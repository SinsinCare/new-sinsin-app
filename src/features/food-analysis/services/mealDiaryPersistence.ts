import type {
  DateAnalysisResponse,
  DiaryAnalysisResult,
  FoodCameraAnalyzeResult,
} from "@/src/types"

export interface MealDiaryPersistenceInput {
  result: FoodCameraAnalyzeResult
  mealType?: string
  recordDate?: string
  diaryId?: number
}

export interface PersistedMealIdentity {
  diaryId: number
  foodAnalysisResultId: number
  analysisId: string
  wasCreated: boolean
}

export interface MealDiaryPersistenceDependencies {
  registerDiary: (
    foodAnalysisResultId: number,
    date: string,
    mealType: string,
  ) => Promise<unknown>
  fetchDateAnalysis: (date: string) => Promise<DateAnalysisResponse>
  fetchDiaryResult: (diaryId: number) => Promise<DiaryAnalysisResult>
}

function analysisIdentity(result: FoodCameraAnalyzeResult): string {
  return result.analysisId ?? String(result.foodAnalysisResultId)
}

async function findMatchingDiary(
  dependencies: MealDiaryPersistenceDependencies,
  input: Required<Pick<MealDiaryPersistenceInput, "mealType" | "recordDate">> &
    Pick<MealDiaryPersistenceInput, "result">,
): Promise<number | null> {
  const dateAnalysis = await dependencies.fetchDateAnalysis(input.recordDate)
  const candidateDiaryIds = dateAnalysis.result.diets.flatMap((item) =>
    item.mealType === input.mealType && item.diaryId != null
      ? [item.diaryId]
      : [],
  )
  /*
    후보를 **한꺼번에** 조회한다. 차례로 기다리면 같은 끼니에 n건이 있을 때 왕복 n번이
    직렬로 쌓이고(N+1), `ensureMealDiary` 는 이 조회를 최대 세 번 한다. 호출부가 넘기는
    `fetchDiaryResult` 는 홈이 미리 받아 둔 캐시를 지나므로(`useMealPersistenceActions`)
    대개는 네트워크 없이 끝난다.
  */
  const details = await Promise.all(
    candidateDiaryIds.map((diaryId) => dependencies.fetchDiaryResult(diaryId)),
  )
  const matched = details.findIndex(
    (detail) =>
      detail.foodAnalysisResultId === input.result.foodAnalysisResultId,
  )
  return matched === -1 ? null : candidateDiaryIds[matched]
}

export async function ensureMealDiary(
  dependencies: MealDiaryPersistenceDependencies,
  input: MealDiaryPersistenceInput,
): Promise<PersistedMealIdentity> {
  if (input.result.foodAnalysisResultId <= 0) {
    throw new Error("meal_analysis_not_persistable")
  }

  if (input.diaryId != null) {
    return {
      diaryId: input.diaryId,
      foodAnalysisResultId: input.result.foodAnalysisResultId,
      analysisId: analysisIdentity(input.result),
      wasCreated: false,
    }
  }

  if (!input.mealType) throw new Error("meal_type_required")
  if (!input.recordDate) throw new Error("meal_record_date_required")

  const lookupInput = {
    result: input.result,
    mealType: input.mealType,
    recordDate: input.recordDate,
  }
  const existingDiaryId = await findMatchingDiary(dependencies, lookupInput)
  if (existingDiaryId != null) {
    return {
      diaryId: existingDiaryId,
      foodAnalysisResultId: input.result.foodAnalysisResultId,
      analysisId: analysisIdentity(input.result),
      wasCreated: false,
    }
  }

  try {
    await dependencies.registerDiary(
      input.result.foodAnalysisResultId,
      input.recordDate,
      input.mealType,
    )
  } catch (error) {
    // The server may have committed the diary before the response was lost.
    // Reconcile once before exposing the failure so a retry does not save it again.
    const reconciledDiaryId = await findMatchingDiary(
      dependencies,
      lookupInput,
    ).catch(() => null)
    if (reconciledDiaryId == null) throw error
    return {
      diaryId: reconciledDiaryId,
      foodAnalysisResultId: input.result.foodAnalysisResultId,
      analysisId: analysisIdentity(input.result),
      wasCreated: true,
    }
  }

  const createdDiaryId = await findMatchingDiary(dependencies, lookupInput)
  if (createdDiaryId == null) throw new Error("saved_meal_identity_not_found")
  return {
    diaryId: createdDiaryId,
    foodAnalysisResultId: input.result.foodAnalysisResultId,
    analysisId: analysisIdentity(input.result),
    wasCreated: true,
  }
}
