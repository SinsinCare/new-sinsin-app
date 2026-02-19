import { ScrollView, StyleSheet, Alert } from "react-native"
import { View } from "tamagui"
import { CharacterSection } from "./CharacterSection"
import { MealButtons } from "./MealButtons"
import { MealType } from "../../types"
import { HydrationTracker } from "./HydrationTracker"
import { WeightEdemaTracker } from "./WeightEdemaTracker"
import { ThreeDaysCalendar } from "./ThreeDaysCalendar"
import { useHomeRecord } from "../../hooks/useHomeRecord"
import { useState } from "react"
import {
  pickImageFromGallery,
  takePhoto,
} from "@/src/features/recipe/services/imagePickerService"

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
  const [mealImages, setMealImages] = useState<
    Partial<Record<MealType, string>>
  >({})

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
          if (uri)
            setMealImages((prev) => ({ ...prev, [selectedMealType]: uri }))
        },
      },
      {
        text: "갤러리",
        onPress: async () => {
          const uri = await pickImageFromGallery()
          if (uri)
            setMealImages((prev) => ({ ...prev, [selectedMealType]: uri }))
        },
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
})
