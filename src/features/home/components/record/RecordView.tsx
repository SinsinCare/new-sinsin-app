import { ScrollView, StyleSheet, Alert, Modal } from "react-native"
import { View, Text } from "tamagui"
import { CharacterSection } from "./CharacterSection"
import { MealButtons } from "./MealButtons"
import { MealType } from "../../types"
import { HydrationTracker } from "./HydrationTracker"
import { WeightEdemaTracker } from "./WeightEdemaTracker"
import { ThreeDaysCalendar } from "./ThreeDaysCalendar"
import { getThreeDays } from "../../utils/getThreeDays"
import { useHomeRecord } from "../../hooks/useHomeRecord"
import { useFoodAnalysis } from "../../hooks/useFoodAnalysis"
import { useState, useEffect, useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated"
import {
  pickImageFromGallery,
  takePhoto,
} from "@/src/features/recipe/services/imagePickerService"
import { FoodAnalysisResult } from "./FoodAnalysisResult"
import { TextRecord } from "./TextRecord"
import LoadingSvg from "@/assets/icons/loading.svg"
import { tokens } from "@/src/theme/tokens"
import { useDateAnalysis } from "../../hooks/useDateAnalysis"

interface RecordViewProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  selectedMealType: MealType | null
  onSelectMealType: (mealType: MealType) => void
}

export function RecordView({
  selectedDate,
  onSelectDate,
  selectedMealType,
  onSelectMealType,
}: RecordViewProps) {
  const record = useHomeRecord()
  const {
    isAnalyzing,
    isResultOpen,
    analysisResult,
    analyzedMealType,
    analyzedImageUri,
    analyzeImage,
    analyzeText,
    registerDiary,
    closeResult,
  } = useFoodAnalysis()
  const { data } = useDateAnalysis(selectedDate)
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
  const [dots, setDots] = useState(".")

  useEffect(() => {
    setMealImages({})
    setRecordedMeals({})
  }, [selectedDate])

  const floatY = useSharedValue(0)
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }))

  useEffect(() => {
    if (isAnalyzing) {
      floatY.value = withRepeat(
        withSequence(
          withTiming(-10, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      )
      const interval = setInterval(() => {
        setDots((d) => (d.length >= 3 ? "." : d + "."))
      }, 500)
      return () => clearInterval(interval)
    } else {
      floatY.value = 0
      setDots(".")
    }
  }, [isAnalyzing, floatY])

  const apiDiets = data?.result.diets ?? []
  const apiMealImages = Object.fromEntries(
    apiDiets.map((d) => [d.mealType, d.imageUrl]),
  ) as Partial<Record<MealType, string>>
  const apiRecordedMeals = Object.fromEntries(
    apiDiets.map((d) => [d.mealType, true]),
  ) as Partial<Record<MealType, boolean>>

  const mergedMealImages = { ...apiMealImages, ...mealImages }
  const mergedRecordedMeals = { ...apiRecordedMeals, ...recordedMeals }

  const hasSelectedDateRecord =
    apiDiets.length > 0 || Object.values(recordedMeals).some(Boolean)

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

  const handleAddToRecord = () => {
    registerDiary(selectedDate, (mealType, imageUri) => {
      setRecordedMeals((prev) => ({ ...prev, [mealType]: true }))
      if (imageUri) {
        setMealImages((prev) => ({ ...prev, [mealType]: imageUri }))
      }
      queryClient.invalidateQueries({ queryKey: ["dateAnalysis"] })
    })
  }

  const handleRecord = () => {
    if (!selectedMealType) return
    Alert.alert("사진 첨부", "방법을 선택하세요", [
      {
        text: "카메라",
        onPress: async () => {
          const uri = await takePhoto()
          if (uri) {
            analyzeImage(uri, selectedMealType)
          }
        },
      },
      {
        text: "갤러리",
        onPress: async () => {
          const uri = await pickImageFromGallery()
          if (uri) {
            analyzeImage(uri, selectedMealType)
          }
        },
      },
      {
        text: "직접 입력",
        onPress: () => setIsTextRecordOpen(true),
      },
      { text: "취소", style: "cancel" },
    ])
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

      <View height={15} />

      <CharacterSection
        selectedDate={selectedDate}
        hasRecord={hasSelectedDateRecord}
      />

      <MealButtons
        onSelectMealType={onSelectMealType}
        selectedMealType={selectedMealType}
        mealImages={mergedMealImages}
        recordedMeals={mergedRecordedMeals}
        onRecord={handleRecord}
      />

      <Modal visible={isAnalyzing} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <Animated.View style={floatStyle}>
            <LoadingSvg width={55} height={55} />
          </Animated.View>
          <Text fontSize={18} fontWeight="600" marginTop="$4">
            {`식단을 분석하고 있어요${dots}`}
          </Text>
        </View>
      </Modal>

      <TextRecord
        open={isTextRecordOpen}
        onClose={() => setIsTextRecordOpen(false)}
        onSubmit={(text) => {
          if (!selectedMealType) return
          setIsTextRecordOpen(false)
          analyzeText(text, selectedMealType)
        }}
      />

      <FoodAnalysisResult
        result={analysisResult}
        open={isResultOpen}
        onClose={closeResult}
        imageUri={analyzedImageUri ?? undefined}
        mealType={analyzedMealType ?? undefined}
        onAddToRecord={handleAddToRecord}
      />

      <View height={10} />

      <HydrationTracker
        intake={record.intake}
        dailyGoal={record.dailyGoal}
        percentage={record.percentage}
        remaining={record.remaining}
        isGoalAchieved={record.isGoalAchieved}
        addWater={record.addWater}
        onReset={record.resetHydration}
      />

      <View height={10} />

      <WeightEdemaTracker />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 100,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: tokens.color.appBg.val,
    alignItems: "center",
    justifyContent: "center",
  },
})
