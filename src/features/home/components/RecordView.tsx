import { StyleSheet } from "react-native"
import { View } from "tamagui"
import CharacterSection from "./CharacterSection"
import { MealButtons } from "./MealButtons"
import { MealType } from "../types"

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
    <>
      <View style={styles.characterContainer}>
        <CharacterSection selectedDate={selectedDate} />
      </View>

      <MealButtons
        onSelectMealType={onSelectMealType}
        selectedMealType={selectedMealType}
      />
    </>
  )
}

export default RecordView

const styles = StyleSheet.create({
  characterContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
})
