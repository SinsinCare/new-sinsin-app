import { ThemedView } from "@/components/themed-view"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { HomeHeader } from "@/src/features/home/components/HomeHeader"
import { useState } from "react"
import { MainTab } from "@/src/features/home/types"
import RecordView from "@/src/features/home/components/RecordView"
import StatusView from "@/src/features/home/components/StatusView"
import { StyleSheet } from "react-native"

export default function HomeScreen() {
  const [mainTab, setMainTab] = useState<MainTab>("record")
  const insets = useSafeAreaInsets()

  return (
    <ThemedView
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <HomeHeader mainTab={mainTab} onChangeTab={setMainTab} />

      {mainTab === "record" ? <RecordView /> : <StatusView />}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
})
