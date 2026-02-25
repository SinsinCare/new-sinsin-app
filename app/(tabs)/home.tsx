import { ThemedView } from "@/components/themed-view"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { HomeHeader } from "@/src/features/home/components/HomeHeader"
import { useState } from "react"
import { MainTab, MealType } from "@/src/features/home/types"
import { RecordView } from "@/src/features/home/components/record/RecordView"
import { StatisticsView } from "@/src/features/home/components/statistics/StatisticsView"
import { StyleSheet } from "react-native"
import { useTheme } from "tamagui"
import { tokens } from "@/src/theme/tokens"

export default function HomeScreen() {
  const [mainTab, setMainTab] = useState<MainTab>("record")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(
    null,
  )
  const insets = useSafeAreaInsets()
  const theme = useTheme()

  const handleSelectMealType = (mealType: MealType) => {
    setSelectedMealType(mealType)
  }

  return (
    <ThemedView
      lightColor={tokens.color.appBg.val}
      darkColor={theme.backgroundFocus.val}
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <HomeHeader
        topInset={insets.top}
        mainTab={mainTab}
        onChangeTab={setMainTab}
      />

      {mainTab === "record" ? (
        <RecordView
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          selectedMealType={selectedMealType}
          onSelectMealType={handleSelectMealType}
        />
      ) : (
        <StatisticsView
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          selectedMealType={selectedMealType}
          onSelectMealType={handleSelectMealType}
          onGoToRecord={() => setMainTab("record")}
        />
      )}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "flex-start",
    paddingHorizontal: 25,
  },
})
