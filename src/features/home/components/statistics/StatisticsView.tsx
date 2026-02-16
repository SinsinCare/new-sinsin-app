import { TouchableOpacity, ScrollView, StyleSheet } from "react-native"
import { Text, XStack, YStack } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { IntakeSummary } from "./IntakeSummary"
import { DietaryGuide } from "./DietaryGuide"
import { DietaryRecord } from "./DietaryRecord"
import { WeekCalendar } from "./WeekCalendar"
import { MealType } from "../../types"
import { WeightEdemaResult } from "./WeightEdemaResult"
import { getWeekLabel } from "../../utils/getWeekDays"

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
  const goToPrevWeek = () => {
    const prev = new Date(selectedDate)
    prev.setDate(prev.getDate() - 7)
    onSelectDate(prev)
  }

  const goToNextWeek = () => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + 7)
    onSelectDate(next)
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <YStack gap="$3" paddingBottom="$3">
        <XStack justifyContent="center" alignItems="center" gap="$3">
          <TouchableOpacity onPress={goToPrevWeek}>
            <Ionicons name="chevron-back" size={18} color="#999" />
          </TouchableOpacity>
          <XStack alignItems="center" gap="$2">
            <Text fontSize="$5" fontWeight="600">
              {getWeekLabel(selectedDate)}
            </Text>
            <Ionicons name="calendar-outline" size={18} color="#999" />
          </XStack>
          <TouchableOpacity onPress={goToNextWeek}>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>
        </XStack>
        <WeekCalendar
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
          recordedDates={[13, 14, 15]}
        />
      </YStack>
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
