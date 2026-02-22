import {
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native"
import { View, Text } from "tamagui"
import { CharacterSection } from "./CharacterSection"
import { MealButtons } from "./MealButtons"
import { MealType } from "../../types"
import { HydrationTracker } from "./HydrationTracker"
import { WeightEdemaTracker } from "./WeightEdemaTracker"
import { ThreeDaysCalendar } from "./ThreeDaysCalendar"
import { useHomeRecord } from "../../hooks/useHomeRecord"
import { useFoodAnalysis } from "../../hooks/useFoodAnalysis"
import { useState } from "react"
import {
  pickImageFromGallery,
  takePhoto,
} from "@/src/features/recipe/services/imagePickerService"
import { FoodAnalysisResult } from "./FoodAnalysisResult"
import { TextRecord } from "./TextRecord"

interface RecordViewProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  selectedMealType: MealType | null
  onSelectMealType: (mealType: MealType) => void
}

// TODO: Firestore 연동 시 실제 기록된 날짜 목록으로 교체
const MOCK_RECORDED_DATES: Date[] = [new Date()]

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

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
    closeResult,
  } = useFoodAnalysis()

  const [mealImages, setMealImages] = useState<
    Partial<Record<MealType, string>>
  >({})
  const [isTextRecordOpen, setIsTextRecordOpen] = useState(false)

  const hasSelectedDateRecord = MOCK_RECORDED_DATES.some((d) =>
    isSameDay(d, selectedDate),
  )

  const handleRecord = () => {
    if (!selectedMealType) return
    Alert.alert("사진 첨부", "방법을 선택하세요", [
      {
        text: "카메라",
        onPress: async () => {
          const uri = await takePhoto()
          if (uri) {
            setMealImages((prev) => ({ ...prev, [selectedMealType]: uri }))
            analyzeImage(uri, selectedMealType)
          }
        },
      },
      {
        text: "갤러리",
        onPress: async () => {
          const uri = await pickImageFromGallery()
          if (uri) {
            setMealImages((prev) => ({ ...prev, [selectedMealType]: uri }))
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
        recordedDates={MOCK_RECORDED_DATES}
      />

      <View height={15} />

      <CharacterSection
        selectedDate={selectedDate}
        hasRecord={hasSelectedDateRecord}
      />

      <MealButtons
        onSelectMealType={onSelectMealType}
        selectedMealType={selectedMealType}
        mealImages={mealImages}
        onRecord={handleRecord}
      />

      <Modal visible={isAnalyzing} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text fontSize="$4" fontWeight="600" color="white" marginTop="$3">
            식단 분석 중...
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
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
})
