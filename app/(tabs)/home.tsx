import { ThemedView } from "@/components/themed-view"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { HomeHeader } from "@/src/features/home/components/HomeHeader"
import { useState } from "react"
import { MainTab, MealType } from "@/src/features/home/types"
import RecordView from "@/src/features/home/components/RecordView"
import StatusView from "@/src/features/home/components/StatusView"
import { StyleSheet } from "react-native"

export default function HomeScreen() {
  const [mainTab, setMainTab] = useState<MainTab>("record")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(
    null,
  )
  const insets = useSafeAreaInsets()

  const handleSelectMealType = (mealType: MealType) => {
    setSelectedMealType(mealType)
  }

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <HomeHeader
        mainTab={mainTab}
        onChangeTab={setMainTab}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      {mainTab === "record" ? (
        <RecordView
          selectedDate={selectedDate}
          selectedMealType={selectedMealType}
          onSelectMealType={handleSelectMealType}
        />
      ) : (
        <StatusView selectedDate={selectedDate} />
      )}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "flex-start",
    paddingHorizontal: 16,
  },
})
