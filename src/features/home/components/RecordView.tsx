import { ScrollView, StyleSheet } from "react-native"
import { View } from "tamagui"
import CharacterSection from "./CharacterSection"
import { MealButtons } from "./MealButtons"
import { MealType } from "../types"
import HydrationTracker from "./HydrationTracker"
import WeightEdemaTracker from "./WeightEdemaTracker"
import { ThreeDaysCalendar } from "./ThreeDaysCalendar"

interface RecordViewProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  selectedMealType: MealType | null
  onSelectMealType: (mealType: MealType) => void
}

const RecordView = ({
  selectedDate,
  onSelectDate,
  selectedMealType,
  onSelectMealType,
}: RecordViewProps) => {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <ThreeDaysCalendar
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />

      <View height={15} />

      <View style={styles.characterContainer}>
        <CharacterSection selectedDate={selectedDate} />
      </View>

      <View height={10} />

      <MealButtons
        onSelectMealType={onSelectMealType}
        selectedMealType={selectedMealType}
      />

      <HydrationTracker />

      <WeightEdemaTracker />
    </ScrollView>
  )
}

export default RecordView

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 75,
  },
  characterContainer: {
    paddingHorizontal: 6,
  },
})
