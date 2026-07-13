import { useRef, useState } from "react"
import { Alert } from "react-native"
import { useQueryClient } from "@tanstack/react-query"
import { foodCameraService } from "@/src/services/data"
import { isApiErrorLike } from "@/src/services/core/apiError"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { usePendingAnalysisStore } from "@/src/stores/pendingAnalysisStore"
import { useNotificationHistoryStore } from "@/src/stores/notificationHistoryStore"
import { markFoodAnalysisRequestHandled } from "../services/foodAnalysisRequestState"
import { pendingAnalysisRequests } from "../storage/pendingAnalysisRequests"
import type {
  DiaryAnalysisResult,
  FoodAnalysisUpdateRequest,
  FoodAnalysisUpdateResult,
  FoodCameraAnalyzeResult,
  FoodAnalysisConfirmationRequest,
  FoodAnalysisJob,
  FoodAnalysisStatus,
  FoodTitleUpdateResponse,
} from "@/src/types"
import { MealType } from "../types"
import { toDateStr } from "@/src/features/home/utils/dateUtils"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { appConfig } from "@/src/config/appConfig"

function createFoodAnalysisRequestId(): string {
  const randomPart = Math.random().toString(36).slice(2, 10)
  return `food-${Date.now().toString(36)}-${randomPart}`
}

function isTimeoutError(error: unknown): boolean {
  if (isApiErrorLike(error)) return error.code === "ECONNABORTED"
  if (!error || typeof error !== "object") return false
  return (error as { code?: unknown }).code === "ECONNABORTED"
}

export function useFoodAnalysis(
  onUpdateSuccess?: (updated: FoodAnalysisUpdateResult) => void,
) {
  const [analysisResult, setAnalysisResult] =
    useState<FoodCameraAnalyzeResult | null>(null)
  const [isResultOpen, setIsResultOpen] = useState(false)
  const [analyzedMealType, setAnalyzedMealType] = useState<MealType | null>(
    null,
  )
  const [analyzedImageUri, setAnalyzedImageUri] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [analysisStatus, setAnalysisStatus] =
    useState<FoodAnalysisStatus | null>(null)
  const [confirmationJob, setConfirmationJob] =
    useState<FoodAnalysisJob | null>(null)
  const queryClient = useQueryClient()

  // 수정 후 서버 데이터로 재동기화 (목록/존재여부 쿼리)
  const refetchDiaryQueries = async () => {
    await queryClient.refetchQueries({ queryKey: ["dateAnalysis"] })
    await queryClient.refetchQueries({ queryKey: ["diaryExistence"] })
  }

  // 분석 도중 X 버튼으로 나갔는지 추적 (ref: async closure에서 최신값 보장)
  const dismissedRef = useRef(false)
  const analysisMethodRef = useRef<"photo" | "text">("photo")

  const setPending = usePendingAnalysisStore((s) => s.setPending)
  const addNotification = useNotificationHistoryStore((s) => s.addNotification)

  const MEAL_LABELS: Record<string, string> = {
    BREAKFAST: "아침",
    LUNCH: "점심",
    DINNER: "저녁",
    SNACKS: "간식",
  }

  const completeAnalysis = async (
    result: FoodCameraAnalyzeResult,
    requestId: string,
    mealType: MealType,
    imageUri: string | null,
  ) => {
    const method = imageUri ? "photo" : "text"
    markFoodAnalysisRequestHandled(requestId)
    await pendingAnalysisRequests.remove(requestId)
    setAnalysisStatus("READY")
    trackAnalyticsEvent("food_analysis_succeeded", { method })

    if (dismissedRef.current) {
      setPending({ result, mealType, imageUri: result.imageUrl ?? imageUri })
      addNotification({
        type: "food_analysis",
        title: "🍽️ 식단 분석 완료",
        body: result.title
          ? `${result.title} 드셨네요! 식단 분석 결과를 확인해보세요.`
          : `${MEAL_LABELS[mealType] ?? mealType} 식단 분석이 완료됐어요. 결과를 확인해보세요!`,
      })
      return
    }

    setAnalysisResult(result)
    setIsResultOpen(true)
  }

  const resolveJob = async (
    initialJob: FoodAnalysisJob,
    requestId: string,
    mealType: MealType,
    imageUri: string | null,
  ) => {
    let job = initialJob
    const startedAt = Date.now()
    while (!dismissedRef.current) {
      setAnalysisStatus(job.status)
      await pendingAnalysisRequests.add({
        requestId,
        analysisId: job.analysisId,
        status: job.status,
        mealType,
        imageUri,
        startedAt,
      })

      if (job.status === "READY" && job.result) {
        await completeAnalysis(job.result, requestId, mealType, imageUri)
        return
      }
      if (job.status === "NEEDS_CONFIRMATION") {
        if (appConfig.foodAnalysisConfirmationEnabled) {
          setConfirmationJob(job)
          return
        }

        // 추가 정보 수집 API/상태는 보존한다. 현재 UI가 비활성인 빌드에서는
        // 서버 요청을 취소하지 않고 pending으로 남겨 다음 복구 시 다시 확인한다.
        setConfirmationJob(null)
        setAnalysisStatus("RESOLVING")
        Alert.alert(
          "분석 결과를 준비하고 있어요",
          "추가 확인 없이 분석을 마칠 수 있도록 요청을 유지했어요. 잠시 후 앱을 다시 열면 결과를 다시 확인할게요.",
        )
        return
      }
      if (job.status === "FAILED") {
        await pendingAnalysisRequests.remove(requestId)
        throw new Error(
          job.error || job.failureMessage || "식단 분석에 실패했어요.",
        )
      }

      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(500, job.pollAfterMs ?? 1500)),
      )
      job = await foodCameraService.fetchAnalysis(job.analysisId)
    }
  }

  const analyzeImage = async (uri: string, mealType: MealType) => {
    dismissedRef.current = false
    analysisMethodRef.current = "photo"
    const requestId = createFoodAnalysisRequestId()
    trackAnalyticsEvent("food_analysis_started", { method: "photo" })
    try {
      setAnalyzedImageUri(uri)
      setAnalyzedMealType(mealType)
      setIsAnalyzing(true)
      await pendingAnalysisRequests.add({
        requestId,
        mealType,
        imageUri: uri,
        startedAt: Date.now(),
      })
      setAnalysisStatus("QUEUED")
      const job = await foodCameraService.createAnalysis(uri, requestId)
      await resolveJob(job, requestId, mealType, uri)
    } catch (error) {
      if (!dismissedRef.current) {
        trackAnalyticsEvent("food_analysis_failed", { method: "photo" })
        console.error("analyzeImage error:", error)
        Alert.alert("분석 실패", getErrorMessage(error))
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const analyzeText = async (text: string, mealType: MealType) => {
    dismissedRef.current = false
    analysisMethodRef.current = "text"
    const requestId = createFoodAnalysisRequestId()
    trackAnalyticsEvent("food_analysis_started", { method: "text" })
    try {
      setAnalyzedMealType(mealType)
      setIsAnalyzing(true)
      await pendingAnalysisRequests.add({
        requestId,
        mealType,
        imageUri: null,
        startedAt: Date.now(),
      })
      const result = await foodCameraService.analyzeText(text, requestId)
      markFoodAnalysisRequestHandled(requestId)
      await pendingAnalysisRequests.remove(requestId)

      if (dismissedRef.current) {
        setPending({ result, mealType, imageUri: result.imageUrl ?? null })
        const notifBody = result.title
          ? `${result.title} 드셨네요! 식단 분석 결과를 확인해보세요.`
          : `${MEAL_LABELS[mealType] ?? mealType} 식단 분석이 완료됐어요. 결과를 확인해보세요!`
        addNotification({
          type: "food_analysis",
          title: "🍽️ 식단 분석 완료",
          body: notifBody,
        })
        return
      }

      setAnalyzedImageUri(result.imageUrl)
      setAnalysisResult(result)
      setIsResultOpen(true)
      trackAnalyticsEvent("food_analysis_succeeded", { method: "text" })
    } catch (error) {
      if (!dismissedRef.current) {
        trackAnalyticsEvent("food_analysis_failed", { method: "text" })
        console.error("analyzeText error:", error)
        if (isTimeoutError(error)) {
          Alert.alert(
            "분석 진행 중",
            "식단 분석 요청이 길어지고 있어요. 서버에서는 계속 처리될 수 있어 앱을 다시 열거나 잠시 후 결과 알림을 확인해주세요.",
          )
        } else {
          Alert.alert("분석 실패", getErrorMessage(error))
        }
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 로딩 중 X 버튼 탭 시 호출
  const dismissAnalysis = () => {
    trackAnalyticsEvent("food_analysis_dismissed", {
      method: analysisMethodRef.current,
    })
    dismissedRef.current = true
    setIsAnalyzing(false)
  }

  const confirmAnalysis = async (
    body: FoodAnalysisConfirmationRequest,
  ): Promise<void> => {
    if (!confirmationJob || !analyzedMealType) return
    try {
      setIsAnalyzing(true)
      setConfirmationJob(null)
      const job = await foodCameraService.confirmAnalysis(
        confirmationJob.analysisId,
        {
          ...body,
          baseRevisionId: confirmationJob.result?.revisionId,
        },
      )
      await resolveJob(
        job,
        confirmationJob.requestId,
        analyzedMealType,
        analyzedImageUri,
      )
    } catch (error) {
      Alert.alert("확인 실패", getErrorMessage(error))
      setConfirmationJob(confirmationJob)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const deferConfirmation = () => {
    dismissedRef.current = true
    setConfirmationJob(null)
  }

  const registerDiary = async (
    selectedDate: Date,
    onSuccess: (mealType: MealType, imageUri: string | null) => void,
  ) => {
    if (!analysisResult || !analyzedMealType) return
    if (analysisResult.foodAnalysisResultId <= 0) {
      Alert.alert(
        "기록 준비 중",
        "분석 결과를 식단 기록과 연결하고 있어요. 잠시 후 다시 시도해 주세요.",
      )
      return
    }
    const date = toDateStr(selectedDate)
    try {
      await foodCameraService.registerDiary(
        analysisResult.foodAnalysisResultId,
        date,
        analyzedMealType,
      )
      trackAnalyticsEvent("food_record_saved", {})
      onSuccess(analyzedMealType, analyzedImageUri)
    } catch (error) {
      trackAnalyticsEvent("food_record_save_failed", {})
      console.error("registerDiary error:", error)
      Alert.alert("등록 실패", getErrorMessage(error))
    }
  }

  const fetchDiaryResult = async (
    diaryId: number,
  ): Promise<DiaryAnalysisResult | undefined> => {
    try {
      const response = await foodCameraService.fetchDiaryResult(diaryId)
      return response
    } catch (error) {
      console.error("fetchDiaryResult error:", error)
      Alert.alert("조회 실패", getErrorMessage(error))
    }
  }

  const updateFoodAnalysis = async (
    foodAnalysisResultId: number,
    body: FoodAnalysisUpdateRequest,
    sourceResult?: FoodCameraAnalyzeResult,
  ): Promise<FoodAnalysisUpdateResult | undefined> => {
    const targetResult = sourceResult ?? analysisResult
    const isConsumptionOnly =
      targetResult?.analysisId != null &&
      targetResult.revision != null &&
      body.consumedRatio != null &&
      body.foods.length === targetResult.foods.length &&
      body.foods.every((food, index) => {
        const current = targetResult.foods[index]
        return (
          food.foodId === current.id &&
          food.name === current.name &&
          food.servingSizeValue === current.servingSizeValue &&
          food.servingSizeUnit === current.servingSizeUnit
        )
      })
    try {
      if (!isConsumptionOnly) setIsUpdating(true)
      const updated = isConsumptionOnly
        ? (
            await foodCameraService.updateConsumption(
              targetResult.analysisId as string,
              {
                baseRevisionId:
                  targetResult.revisionId ??
                  (
                    targetResult.revision as NonNullable<
                      FoodCameraAnalyzeResult["revision"]
                    >
                  ).revisionId,
                baseConsumptionRevisionId:
                  targetResult.consumptionRevision?.consumptionRevisionId,
                items: (
                  targetResult.revision as NonNullable<
                    FoodCameraAnalyzeResult["revision"]
                  >
                ).items.map((revisionItem) => {
                  const food = targetResult.foods.find(
                    (candidate) =>
                      candidate.analysisItemId === revisionItem.analysisItemId,
                  )
                  const supportsBrothRatio =
                    food?.isBroth ||
                    /국|탕|찌개|전골|라면|우동|육수/.test(
                      food?.name ?? revisionItem.name,
                    )
                  return {
                    analysisItemId: revisionItem.analysisItemId,
                    consumedRatio: body.consumedRatio,
                    ...(supportsBrothRatio && body.brothConsumedRatio != null
                      ? { brothConsumedRatio: body.brothConsumedRatio }
                      : {}),
                  }
                }),
              },
            )
          ).result
        : await foodCameraService.updateFoodAnalysis(foodAnalysisResultId, body)
      if (!updated) throw new Error("수정된 식단 결과를 불러오지 못했어요.")
      setAnalysisResult(updated)
      onUpdateSuccess?.(updated)
      await refetchDiaryQueries()
      return updated
    } catch (error) {
      console.error("updateFoodAnalysis error:", error)
      Alert.alert("업데이트 실패", getErrorMessage(error))
    } finally {
      setIsUpdating(false)
    }
  }

  const updateFoodTitle = async (
    foodAnalysisResultId: number,
    title: string,
  ): Promise<FoodTitleUpdateResponse | undefined> => {
    try {
      const response = await foodCameraService.updateFoodTitle(
        foodAnalysisResultId,
        title,
      )
      await refetchDiaryQueries()
      return response
    } catch (error) {
      console.error("updateFoodTitle error:", error)
      Alert.alert("업데이트 실패", getErrorMessage(error))
    }
  }

  const updateDiaryMealType = async (
    diaryId: number,
    mealType: string,
  ): Promise<{ diaryId: number; mealType: string } | undefined> => {
    try {
      const result = await foodCameraService.updateDiaryMealType(
        diaryId,
        mealType,
      )
      await refetchDiaryQueries()
      return result
    } catch (error) {
      console.error("updateDiaryMealType error:", error)
      Alert.alert("끼니 변경 실패", getErrorMessage(error))
    }
  }

  return {
    isAnalyzing,
    isUpdating,
    isResultOpen,
    analysisStatus,
    confirmationJob,
    analysisResult,
    analyzedMealType,
    analyzedImageUri,
    analyzeImage,
    analyzeText,
    dismissAnalysis,
    confirmAnalysis,
    deferConfirmation,
    registerDiary,
    fetchDiaryResult,
    updateFoodAnalysis,
    updateFoodTitle,
    updateDiaryMealType,
    closeResult: () => setIsResultOpen(false),
  }
}
