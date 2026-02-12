import { ScrollView, StyleSheet } from "react-native"
import { ThreeDaysCalendar } from "../record/ThreeDaysCalendar"
import { IntakeSummary } from "./IntakeSummary"
import { DietaryGuide } from "./DietaryGuide"

interface StatisticsViewProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

export function StatisticsView({
  selectedDate,
  onSelectDate,
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
