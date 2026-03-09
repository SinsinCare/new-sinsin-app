import { useState } from "react"
import { Alert } from "react-native"
import { foodCameraService } from "@/src/services/data"
import { getErrorMessage } from "@/src/lib/errorUtils"
import type {
  DiaryAnalysisResult,
  FoodAnalysisUpdateRequest,
  FoodAnalysisUpdateResult,
  FoodCameraAnalyzeResult,
} from "@/src/types"
import { MealType } from "../types"
import { toDateStr } from "@/src/features/home/utils/dateUtils"

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

  const analyzeImage = async (uri: string, mealType: MealType) => {
    try {
      setAnalyzedImageUri(uri)
      setAnalyzedMealType(mealType)
      setIsAnalyzing(true)
      const result = await foodCameraService.analyze(uri)
      setAnalysisResult(result)
      setIsResultOpen(true)
    } catch (error) {
      console.error("analyzeImage error:", error)
      Alert.alert("분석 실패", getErrorMessage(error))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const analyzeText = async (text: string, mealType: MealType) => {
    try {
      setAnalyzedMealType(mealType)
      setAnalyzedImageUri(null)
      setIsAnalyzing(true)
      const result = await foodCameraService.analyzeText(text)
      setAnalysisResult(result)
      setIsResultOpen(true)
    } catch (error) {
      console.error("analyzeText error:", error)
      Alert.alert("분석 실패", getErrorMessage(error))
    } finally {
      setIsAnalyzing(false)
    }
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
      const updated = await foodCameraService.updateFoodAnalysis(
        foodAnalysisResultId,
        body,
      )
      setAnalysisResult(updated)
      onUpdateSuccess?.(updated)
      return updated
    } catch (error) {
      console.error("updateFoodAnalysis error:", error)
      Alert.alert("업데이트 실패", getErrorMessage(error))
    }
  }

  return {
    isAnalyzing,
    isResultOpen,
    analysisResult,
    analyzedMealType,
    analyzedImageUri,
    analyzeImage,
    analyzeText,
    registerDiary,
    fetchDiaryResult,
    updateFoodAnalysis,
    closeResult: () => setIsResultOpen(false),
  }
}
