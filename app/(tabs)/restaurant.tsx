import { useState } from "react"
import { useColorScheme } from "react-native"
import { YStack, View } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { RestaurantTabHeader } from "@/src/features/restaurant/components/RestaurantTabHeader"
import { RestaurantSearchInput } from "@/src/features/restaurant/components/RestaurantSearchInput"
import { KakaoMapWebView } from "@/src/features/restaurant/components/KakaoMapWebView"
import { CurationTab } from "@/src/features/restaurant/components/CurationTab"
import { PlaceSheet } from "@/src/features/restaurant/components/PlaceSheet"

const TABS = [
  { key: "place", label: "장소" },
  { key: "curation", label: "식당 큐레이션" },
]

export default function RestaurantScreen() {
  const insets = useSafeAreaInsets()
  const isDarkMode = useColorScheme() === "dark"
  const [activeTab, setActiveTab] = useState("place")
  const [search, setSearch] = useState("")

  return (
    <YStack
      flex={1}
      backgroundColor={isDarkMode ? "#1F1F21" : "#FCFCFC"}
      paddingTop={insets.top}
    >
      <RestaurantTabHeader
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      {activeTab === "place" && (
        <>
          <YStack paddingHorizontal={16}>
            <RestaurantSearchInput value={search} onChangeText={setSearch} />
          </YStack>
          <View flex={1} marginTop={12}>
            <KakaoMapWebView />
            <PlaceSheet />
          </View>
        </>
      )}
      {activeTab === "curation" && (
        <View flex={1}>
          <CurationTab />
        </View>
      )}
    </YStack>
  )
}
