import { useState } from "react"
import { useColorScheme } from "react-native"
import { YStack } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { RestaurantTabHeader } from "@/src/features/restaurant/components/RestaurantTabHeader"
import { RestaurantSearchInput } from "@/src/features/restaurant/components/RestaurantSearchInput"

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
      <YStack paddingHorizontal={16}>
        <RestaurantSearchInput
          value={search}
          onChangeText={setSearch}
        />
      </YStack>
    </YStack>
  )
}
