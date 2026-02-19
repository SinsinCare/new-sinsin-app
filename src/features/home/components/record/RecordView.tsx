import { ScrollView, StyleSheet } from "react-native"
import { View } from "tamagui"
import { CharacterSection } from "./CharacterSection"
import { MealButtons } from "./MealButtons"
import { MealType } from "../../types"
import { HydrationTracker } from "./HydrationTracker"
import { WeightEdemaTracker } from "./WeightEdemaTracker"
import { ThreeDaysCalendar } from "./ThreeDaysCalendar"
import { useHomeRecord } from "../../hooks/useHomeRecord"

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

  const hasSelectedDateRecord = MOCK_RECORDED_DATES.some((d) =>
    isSameDay(d, selectedDate),
  )

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

      <View height={10} />

      <MealButtons
        onSelectMealType={onSelectMealType}
        selectedMealType={selectedMealType}
      />

      <HydrationTracker
        intake={record.intake}
        dailyGoal={record.dailyGoal}
        percentage={record.percentage}
        remaining={record.remaining}
        isGoalAchieved={record.isGoalAchieved}
        addWater={record.addWater}
      />

      <WeightEdemaTracker
        weight={record.weight}
        onChangeWeight={record.setWeight}
        yesterdayWeight={record.yesterdayWeight}
        edemaLevel={record.edemaLevel}
        onSelectEdema={record.setEdemaLevel}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 75,
  },
})
