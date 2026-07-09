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
  FoodTitleUpdateResponse,
} from "@/src/types"
import { MealType } from "../types"
import { toDateStr } from "@/src/features/home/utils/dateUtils"

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
  const queryClient = useQueryClient()

  // 수정 후 서버 데이터로 재동기화 (목록/존재여부 쿼리)
  const refetchDiaryQueries = async () => {
    await queryClient.refetchQueries({ queryKey: ["dateAnalysis"] })
    await queryClient.refetchQueries({ queryKey: ["diaryExistence"] })
  }

  // 분석 도중 X 버튼으로 나갔는지 추적 (ref: async closure에서 최신값 보장)
  const dismissedRef = useRef(false)

  const setPending = usePendingAnalysisStore((s) => s.setPending)
  const addNotification = useNotificationHistoryStore((s) => s.addNotification)

  const MEAL_LABELS: Record<string, string> = {
    BREAKFAST: "아침",
    LUNCH: "점심",
    DINNER: "저녁",
    SNACKS: "간식",
  }

  const analyzeImage = async (uri: string, mealType: MealType) => {
    dismissedRef.current = false
    const requestId = createFoodAnalysisRequestId()
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
      const result = await foodCameraService.analyze(uri, requestId)
      markFoodAnalysisRequestHandled(requestId)
      await pendingAnalysisRequests.remove(requestId)

      if (dismissedRef.current) {
        setPending({ result, mealType, imageUri: uri })
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

      setAnalysisResult(result)
      setIsResultOpen(true)
    } catch (error) {
      if (!dismissedRef.current) {
        console.error("analyzeImage error:", error)
        Alert.alert("분석 실패", getErrorMessage(error))
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const analyzeText = async (text: string, mealType: MealType) => {
    dismissedRef.current = false
    const requestId = createFoodAnalysisRequestId()
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
    } catch (error) {
      if (!dismissedRef.current) {
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
    dismissedRef.current = true
    setIsAnalyzing(false)
  }

  const registerDiary = async (
    selectedDate: Date,
    onSuccess: (mealType: MealType, imageUri: string | null) => void,
  ) => {
    if (!analysisResult || !analyzedMealType) return
    const date = toDateStr(selectedDate)
    try {
      await foodCameraService.registerDiary(
        analysisResult.foodAnalysisResultId,
        date,
        analyzedMealType,
      )
      onSuccess(analyzedMealType, analyzedImageUri)
    } catch (error) {
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
  ): Promise<FoodAnalysisUpdateResult | undefined> => {
    try {
      setIsUpdating(true)
      const updated = await foodCameraService.updateFoodAnalysis(
        foodAnalysisResultId,
        body,
      )
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
    analysisResult,
    analyzedMealType,
    analyzedImageUri,
    analyzeImage,
    analyzeText,
    dismissAnalysis,
    registerDiary,
    fetchDiaryResult,
    updateFoodAnalysis,
    updateFoodTitle,
    updateDiaryMealType,
    closeResult: () => setIsResultOpen(false),
  }
}
