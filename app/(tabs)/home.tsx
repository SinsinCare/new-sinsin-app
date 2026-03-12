import { ThemedView } from "@/components/themed-view"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { HomeHeader } from "@/src/features/home/components/HomeHeader"
import { useState } from "react"
import { MainTab } from "@/src/features/home/types"
import { RecordView } from "@/src/features/home/components/record/RecordView"
import { StatisticsView } from "@/src/features/home/components/statistics/StatisticsView"
import { StyleSheet, View } from "react-native"
import { tokens } from "@/src/theme/tokens"

export default function HomeScreen() {
  const [mainTab, setMainTab] = useState<MainTab>("record")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const insets = useSafeAreaInsets()

  const handleChangeTab = (tab: MainTab) => {
    setMainTab(tab)
    setSelectedDate(new Date())
  }

  return (
    <ThemedView
      lightColor={tokens.color.appBg.val}
      darkColor={tokens.color.appBgDark.val}
      style={styles.container}
    >
      <HomeHeader
        topInset={insets.top}
        mainTab={mainTab}
        onChangeTab={handleChangeTab}
      />

      <View style={[styles.tabContent, mainTab !== "record" && styles.hidden]}>
        <RecordView
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onSelectMealType={() => {}}
        />
      </View>
      <View style={[styles.tabContent, mainTab !== "stats" && styles.hidden]}>
        <StatisticsView
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onGoToRecord={() => setMainTab("record")}
          isActive={mainTab === "stats"}
        />
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 25,
  },
  tabContent: {
    flex: 1,
  },
  hidden: {
    display: "none",
  },
})
