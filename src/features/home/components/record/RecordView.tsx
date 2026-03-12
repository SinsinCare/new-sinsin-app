import { ScrollView, StyleSheet, Alert } from "react-native"
import type { DiaryAnalysisResult } from "@/src/types"
import { RecordOptionsSheet } from "./RecordOptionsSheet"
import { View } from "tamagui"
import { CharacterSection } from "./CharacterSection"
import { MealButtons } from "./MealButtons"
import { MealType } from "../../types"
import { HydrationTracker } from "./HydrationTracker"
import { WeightEdemaTracker } from "./WeightEdemaTracker"
import { ThreeDaysCalendar } from "./ThreeDaysCalendar"
import { getThreeDays } from "../../utils/getThreeDays"
import { useHomeRecord } from "../../hooks/useHomeRecord"
import { useFoodAnalysis } from "../../hooks/useFoodAnalysis"
import { useState, useEffect, useMemo, useRef } from "react"
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
    registerDiary,
    closeResult,
    updateFoodAnalysis,
    fetchDiaryResult,
  } = useFoodAnalysis()
  const { data } = useDateAnalysis(selectedDate)
  const { data: streak = 0 } = useStreak()
  const calendarDays = useMemo(() => getThreeDays(new Date(), "record"), [])
  const { data: dataDay0 } = useDateAnalysis(calendarDays[0].date)
  const { data: dataDay1 } = useDateAnalysis(calendarDays[1].date)
  const { data: dataDay2 } = useDateAnalysis(calendarDays[2].date)
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

  const calendarDataList = [dataDay0, dataDay1, dataDay2]
  const recordedDates = calendarDays
    .filter((day, i) => {
      const diets = calendarDataList[i]?.result.diets ?? []
      const isSameAsSelected =
        day.date.getFullYear() === selectedDate.getFullYear() &&
        day.date.getMonth() === selectedDate.getMonth() &&
        day.date.getDate() === selectedDate.getDate()
      return (
        diets.length > 0 ||
        (isSameAsSelected && Object.values(recordedMeals).some(Boolean))
      )
    })
    .map((day) => day.date)

  const totalIntake = data?.result.analysis?.extraWater ?? 0
  const dailyGoal = record.dailyGoal
  const percentage = Math.min((totalIntake / dailyGoal) * 100, 100)
  const remaining = Math.max(dailyGoal - totalIntake, 0)

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

  const handleRecord = (mealType: MealType) => {
    recordingMealTypeRef.current = mealType
    setIsOptionsSheetOpen(true)
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
      <ThreeDaysCalendar
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        recordedDates={recordedDates}
      />

      <View height={10} />

      <CharacterSection
        selectedDate={selectedDate}
        hasRecord={hasSelectedDateRecord}
        characterType={characterType}
        streak={streak}
        withinLimits={withinLimits}
      />

      <View height={5} />

      <MealButtons
        onSelectMealType={onSelectMealType}
        mealImages={mergedMealImages}
        recordedMeals={mergedRecordedMeals}
        mealTimes={apiMealTimes}
        onRecord={handleRecord}
        onViewResult={handleViewMealResult}
      />

      <RecordOptionsSheet
        open={isOptionsSheetOpen}
        onClose={() => setIsOptionsSheetOpen(false)}
        onCameraPhoto={handleCameraPhoto}
        onTextRecord={handleTextRecord}
        onRecipeLoad={handleRecipeLoad}
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

      <LoadingOverlay visible={isAnalyzing} message="식단을 분석하고 있어요" />

      <View height={10} />

      <HydrationTracker
        intake={totalIntake}
        dailyGoal={dailyGoal}
        percentage={percentage}
        remaining={remaining}
        isGoalAchieved={percentage >= 100}
        addWater={async (amount) => {
          await record.addWater(amount)
          await queryClient.refetchQueries({ queryKey: ["dateAnalysis"] })
        }}
        onReset={async () => {
          await record.resetHydration(data?.result.analysis?.extraWater ?? 0)
          await queryClient.refetchQueries({ queryKey: ["dateAnalysis"] })
        }}
      />

      <View height={10} />

      <WeightEdemaTracker
        bodyRecords={data?.result.bodyRecords}
        selectedDate={selectedDate}
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
