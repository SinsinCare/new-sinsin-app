import { ScrollView, StyleSheet, Alert } from "react-native"
import type {
  DiaryAnalysisResult,
  FoodAnalysisUpdateRequest,
  FoodAnalysisUpdateResult,
} from "@/src/types"
import { RecordOptionsSheet } from "./RecordOptionsSheet"
import { View } from "tamagui"
import { CharacterSection } from "./CharacterSection"
import { MealButtons } from "./MealButtons"
import { MealType } from "../../types"
import { MEAL_OPTIONS } from "../../data/mealConstants"
import { HydrationTracker } from "./HydrationTracker"
import { WeightEdemaTracker } from "./WeightEdemaTracker"
import { BloodMetricsTracker } from "./BloodMetricsTracker"
import { useHomeRecord } from "../../hooks/useHomeRecord"
import { useFoodAnalysis } from "../../hooks/useFoodAnalysis"
import { useState, useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  pickImageFromGallery,
  takePhoto,
} from "@/src/features/recipe/services/imagePickerService"
import { FoodAnalysisResult } from "../FoodAnalysisResult"
import { LoadingOverlay } from "../LoadingOverlay"
import { TextRecord } from "./TextRecord"
import { tokens } from "@/src/theme/tokens"
import { useDateAnalysis } from "../../hooks/useDateAnalysis"
import { useStreak } from "../../hooks/useStreak"
import { CKD_NUTRIENT_LIMITS } from "../../data/nutrientConstants"
import { usePendingAnalysisStore } from "@/src/stores/pendingAnalysisStore"
import { foodCameraService } from "@/src/services/data"
import { toDateStr } from "../../utils/dateUtils"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { isSkippedDiet, toSkippedMealMap } from "../../utils/mealRecordUtils"

interface RecordViewProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onSelectMealType: (mealType: MealType) => void
}

export function RecordView({
  selectedDate,
  onSelectDate,
  onSelectMealType,
}: RecordViewProps) {
  const record = useHomeRecord(selectedDate)
  const [viewDiaryResult, setViewDiaryResult] =
    useState<DiaryAnalysisResult | null>(null)
  const [isViewResultOpen, setIsViewResultOpen] = useState(false)
  const [viewResultMealType, setViewResultMealType] = useState<
    MealType | undefined
  >()

  const {
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
    closeResult,
    updateFoodAnalysis,
    fetchDiaryResult,
  } = useFoodAnalysis()

  const pending = usePendingAnalysisStore((s) => s.pending)
  const setPending = usePendingAnalysisStore((s) => s.setPending)
  const [isPendingOpen, setIsPendingOpen] = useState(false)
  const [isPendingUpdating, setIsPendingUpdating] = useState(false)

  useEffect(() => {
    if (pending) setIsPendingOpen(true)
  }, [pending])
  const { data } = useDateAnalysis(selectedDate)
  const { data: streak = 0 } = useStreak()
  const queryClient = useQueryClient()

  const [mealImages, setMealImages] = useState<
    Partial<Record<MealType, string>>
  >({})
  const [recordedMeals, setRecordedMeals] = useState<
    Partial<Record<MealType, boolean>>
  >({})
  const [isTextRecordOpen, setIsTextRecordOpen] = useState(false)
  const [isOptionsSheetOpen, setIsOptionsSheetOpen] = useState(false)
  const recordingMealTypeRef = useRef<MealType | null>(null)
  const [recordingMealLabel, setRecordingMealLabel] = useState<string>("")
  useEffect(() => {
    setMealImages({})
    setRecordedMeals({})
  }, [selectedDate])

  const apiDiets = data?.result.diets ?? []
  const apiMealImages = Object.fromEntries(
    apiDiets.map((d) => [d.mealType, d.imageUrl]),
  ) as Partial<Record<MealType, string>>
  const apiRecordedMeals = Object.fromEntries(
    apiDiets.map((d) => [d.mealType, true]),
  ) as Partial<Record<MealType, boolean>>
  const apiSkippedMeals = toSkippedMealMap(apiDiets)
  const apiMealTimes = Object.fromEntries(
    apiDiets.map((d) => {
      const date = new Date(d.createdAt + "Z")
      const h = String(date.getHours()).padStart(2, "0")
      const m = String(date.getMinutes()).padStart(2, "0")
      return [d.mealType, `${h}:${m}`]
    }),
  ) as Partial<Record<MealType, string>>

  const mergedMealImages = { ...apiMealImages, ...mealImages }
  const mergedRecordedMeals = { ...apiRecordedMeals, ...recordedMeals }

  const hasSelectedDateRecord =
    apiDiets.length > 0 || Object.values(recordedMeals).some(Boolean)

  const analysis = data?.result.analysis ?? null
  const withinLimits =
    analysis !== null &&
    CKD_NUTRIENT_LIMITS.every((limit) => {
      const intake =
        limit.nutrient === "수분"
          ? (analysis.water ?? 0) + (analysis.extraWater ?? 0)
          : limit.nutrient === "단백질"
            ? (analysis.protein ?? 0)
            : limit.nutrient === "나트륨"
              ? (analysis.sodium ?? 0)
              : limit.nutrient === "칼륨"
                ? (analysis.potassium ?? 0)
                : limit.nutrient === "인"
                  ? (analysis.phosphorus ?? 0)
                  : 0
      return intake <= limit.max
    })

  const recordedCount =
    Object.values(mergedRecordedMeals).filter(Boolean).length
  const recordRate = (recordedCount / 4) * 100
  const characterType =
    recordRate >= 85
      ? "character-excellent"
      : recordRate >= 70
        ? "character-good"
        : "character-caution"

  // 오늘 기록이 있고 영양소 제한조건까지 지켰을 때 풍성한(high) 배경
  const backgroundVariant: "low" | "high" =
    hasSelectedDateRecord && withinLimits ? "high" : "low"

  const serverExtraWater = data?.result.analysis?.extraWater ?? 0
  const { syncFromServer } = record
  const syncFromServerRef = useRef(syncFromServer)
  syncFromServerRef.current = syncFromServer
  useEffect(() => {
    syncFromServerRef.current(serverExtraWater)
  }, [serverExtraWater])

  const handleAddToRecord = async () => {
    await registerDiary(selectedDate, (mealType, imageUri) => {
      setRecordedMeals((prev) => ({ ...prev, [mealType]: true }))
      if (imageUri) {
        setMealImages((prev) => ({ ...prev, [mealType]: imageUri }))
      }
    })
    await queryClient.refetchQueries({ queryKey: ["dateAnalysis"] })
    await queryClient.refetchQueries({ queryKey: ["diaryExistence"] })
  }

  const handlePendingAddToRecord = async () => {
    if (!pending) return
    try {
      await foodCameraService.registerDiary(
        pending.result.foodAnalysisResultId,
        toDateStr(selectedDate),
        pending.mealType,
      )
      setRecordedMeals((prev) => ({ ...prev, [pending.mealType]: true }))
      if (pending.imageUri) {
        setMealImages((prev) => ({
          ...prev,
          [pending.mealType]: pending.imageUri!,
        }))
      }
      await queryClient.refetchQueries({ queryKey: ["dateAnalysis"] })
      await queryClient.refetchQueries({ queryKey: ["diaryExistence"] })
    } catch (error) {
      console.error("handlePendingAddToRecord error:", error)
      Alert.alert("등록 실패", "기록 추가에 실패했어요.")
    }
  }

  const updatePendingFoodAnalysis = async (
    foodAnalysisResultId: number,
    body: FoodAnalysisUpdateRequest,
  ): Promise<FoodAnalysisUpdateResult | undefined> => {
    try {
      setIsPendingUpdating(true)
      const updated = await foodCameraService.updateFoodAnalysis(
        foodAnalysisResultId,
        body,
      )
      if (pending) setPending({ ...pending, result: updated })
      return updated
    } catch (error) {
      console.error("updatePendingFoodAnalysis error:", error)
      Alert.alert("업데이트 실패", "수정에 실패했어요.")
    } finally {
      setIsPendingUpdating(false)
    }
  }

  const handleRecord = (mealType: MealType) => {
    recordingMealTypeRef.current = mealType
    const label = MEAL_OPTIONS.find((o) => o.type === mealType)?.label ?? ""
    setRecordingMealLabel(label)
    setIsOptionsSheetOpen(true)
  }

  const handleSkipMeal = async () => {
    const mealType = recordingMealTypeRef.current
    if (!mealType) return
    setIsOptionsSheetOpen(false)
    try {
      await foodCameraService.skipMeal(toDateStr(selectedDate), mealType)
      setRecordedMeals((prev) => ({ ...prev, [mealType]: true }))
      await queryClient.refetchQueries({ queryKey: ["dateAnalysis"] })
      await queryClient.refetchQueries({ queryKey: ["diaryExistence"] })
    } catch (error) {
      Alert.alert("오류", getErrorMessage(error))
    }
  }

  const handleCameraPhoto = () => {
    setIsOptionsSheetOpen(false)
    const mealType = recordingMealTypeRef.current
    if (!mealType) return
    Alert.alert("사진 첨부", "방법을 선택하세요", [
      {
        text: "카메라",
        onPress: async () => {
          const uri = await takePhoto()
          if (uri) analyzeImage(uri, mealType)
        },
      },
      {
        text: "갤러리",
        onPress: async () => {
          const uri = await pickImageFromGallery()
          if (uri) analyzeImage(uri, mealType)
        },
      },
      { text: "취소", style: "cancel" },
    ])
  }

  const handleTextRecord = () => {
    setIsOptionsSheetOpen(false)
    setIsTextRecordOpen(true)
  }

  const handleRecipeLoad = () => {
    setIsOptionsSheetOpen(false)
  }

  const handleViewMealResult = async (mealType: MealType) => {
    const diet = data?.result.diets.find((d) => d.mealType === mealType)
    if (!diet) return
    if (diet.diaryId === null || isSkippedDiet(diet)) {
      handleRecord(mealType)
      return
    }
    const result = await fetchDiaryResult(diet.diaryId)
    if (result) {
      setViewDiaryResult(result)
      setViewResultMealType(mealType)
      setIsViewResultOpen(true)
    }
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View height={10} />

      <CharacterSection
        selectedDate={selectedDate}
        hasRecord={hasSelectedDateRecord}
        characterType={characterType}
        streak={streak}
        withinLimits={withinLimits}
        backgroundVariant={backgroundVariant}
      />

      <View height={5} />

      <MealButtons
        onSelectMealType={onSelectMealType}
        mealImages={mergedMealImages}
        recordedMeals={mergedRecordedMeals}
        skippedMeals={apiSkippedMeals}
        mealTimes={apiMealTimes}
        onRecord={handleRecord}
        onViewResult={handleViewMealResult}
      />

      <RecordOptionsSheet
        open={isOptionsSheetOpen}
        mealLabel={recordingMealLabel}
        onClose={() => setIsOptionsSheetOpen(false)}
        onCameraPhoto={handleCameraPhoto}
        onTextRecord={handleTextRecord}
        onRecipeLoad={handleRecipeLoad}
        onSkipMeal={handleSkipMeal}
      />

      <TextRecord
        open={isTextRecordOpen}
        onClose={() => setIsTextRecordOpen(false)}
        onSubmit={(text) => {
          const mealType = recordingMealTypeRef.current
          if (!mealType) return
          setIsTextRecordOpen(false)
          analyzeText(text, mealType)
        }}
      />

      <FoodAnalysisResult
        result={analysisResult}
        open={isResultOpen}
        onClose={closeResult}
        imageUri={analyzedImageUri ?? undefined}
        mealType={analyzedMealType ?? undefined}
        onAddToRecord={handleAddToRecord}
        isUpdating={isUpdating}
        updateFoodAnalysis={updateFoodAnalysis}
      />

      <FoodAnalysisResult
        result={viewDiaryResult}
        open={isViewResultOpen}
        onClose={() => setIsViewResultOpen(false)}
        imageUri={viewDiaryResult?.imageUrl}
        mealType={viewResultMealType}
        showAddButton={false}
        isUpdating={isUpdating}
        updateFoodAnalysis={updateFoodAnalysis}
      />

      <FoodAnalysisResult
        result={pending?.result ?? null}
        open={isPendingOpen}
        onClose={() => {
          setIsPendingOpen(false)
          setPending(null)
        }}
        imageUri={pending?.imageUri ?? undefined}
        mealType={pending?.mealType}
        onAddToRecord={handlePendingAddToRecord}
        isUpdating={isPendingUpdating}
        updateFoodAnalysis={updatePendingFoodAnalysis}
      />

      <LoadingOverlay
        visible={isAnalyzing}
        message="식단을 분석하고 있어요"
        onDismiss={dismissAnalysis}
      />

      <View height={10} />

      <HydrationTracker
        intake={record.intake}
        dailyGoal={record.dailyGoal}
        percentage={record.percentage}
        remaining={record.remaining}
        isGoalAchieved={record.isGoalAchieved}
        addWater={record.addWater}
        onReset={() => {
          record.resetHydration(serverExtraWater)
        }}
      />

      <View height={10} />

      <WeightEdemaTracker
        bodyRecords={data?.result.bodyRecords}
        selectedDate={selectedDate}
      />

      <BloodMetricsTracker
        selectedDate={selectedDate}
        dateAnalysis={data?.result}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 10,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: tokens.color.appBg.val,
    alignItems: "center",
    justifyContent: "center",
  },
})
