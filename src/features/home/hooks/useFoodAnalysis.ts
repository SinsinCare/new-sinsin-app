import { useState } from "react"
import { Alert } from "react-native"
import { foodCameraService } from "@/src/services/data"
import type { FoodCameraAnalyzeResult } from "@/src/types"
import { MealType } from "../types"
import { toDateStr } from "@/src/utils/dateUtils"

export function useFoodAnalysis() {
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
      const message =
        error instanceof Error
          ? error.message
          : "음식 분석 중 오류가 발생했습니다."
      Alert.alert("분석 실패", message)
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
      const message =
        error instanceof Error
          ? error.message
          : "음식 분석 중 오류가 발생했습니다."
      Alert.alert("분석 실패", message)
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
      const message =
        error instanceof Error
          ? error.message
          : "다이어리 등록 중 오류가 발생했습니다."
      Alert.alert("등록 실패", message)
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
    closeResult: () => setIsResultOpen(false),
  }
}
