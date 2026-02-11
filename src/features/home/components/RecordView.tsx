import { ScrollView, StyleSheet } from "react-native"
import { View } from "tamagui"
import CharacterSection from "./CharacterSection"
import { MealButtons } from "./MealButtons"
import { MealType } from "../types"
import HydrationTracker from "./HydrationTracker"
import WeightEdemaTracker from "./WeightEdemaTracker"

interface RecordViewProps {
  selectedDate: Date
  selectedMealType: MealType | null
  onSelectMealType: (mealType: MealType) => void
}

const RecordView = ({
  selectedDate,
  selectedMealType,
  onSelectMealType,
}: RecordViewProps) => {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.characterContainer}>
        <CharacterSection selectedDate={selectedDate} />
      </View>

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
    paddingBottom: 45,
  },
  characterContainer: {
    paddingHorizontal: 6,
  },
})
