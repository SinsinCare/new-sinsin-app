import { ScrollView, StyleSheet } from "react-native"
import { ThreeDaysCalendar } from "../record/ThreeDaysCalendar"
import { IntakeSummary } from "./IntakeSummary"
import { DietaryGuide } from "./DietaryGuide"
import { DietaryRecord } from "./DietaryRecord"
import { MealType } from "../../types"
import { WeightEdemaResult } from "./WeightEdemaResult"

interface StatisticsViewProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  selectedMealType: MealType | null
  onSelectMealType: (mealType: MealType) => void
}

export function StatisticsView({
  selectedDate,
  onSelectDate,
  selectedMealType,
  onSelectMealType,
}: StatisticsViewProps) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <ThreeDaysCalendar
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        mode="statistics"
      />

      <IntakeSummary />
      <DietaryGuide />

      <DietaryRecord
        selectedMealType={selectedMealType}
        onSelectMealType={onSelectMealType}
      />

      <WeightEdemaResult />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 75,
  },
  characterContainer: {
    paddingHorizontal: 6,
  },
})
