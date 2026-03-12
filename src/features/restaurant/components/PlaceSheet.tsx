import { useMemo } from "react"
import { StyleSheet, useColorScheme } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet"
import { PlaceFilterChips } from "./PlaceFilterChips"
import { PlaceCard } from "./PlaceCard"
import { MOCK_PLACE_RESTAURANTS } from "../data/curationData"

export function PlaceSheet() {
  const isDarkMode = useColorScheme() === "dark"
  const insets = useSafeAreaInsets()
  const snapPoints = useMemo(() => ["40%", "100%"], [])

  const backgroundColor = isDarkMode ? "#1F1F21" : "#FCFCFC"
  const handleColor = isDarkMode ? "#555555" : "#C4C4C4"

  return (
    <BottomSheet
      index={0}
      snapPoints={snapPoints}
      backgroundStyle={[styles.background, { backgroundColor }]}
      handleIndicatorStyle={[styles.handle, { backgroundColor: handleColor }]}
    >
      <PlaceFilterChips />
      <BottomSheetScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom }}
      >
        {MOCK_PLACE_RESTAURANTS.map((restaurant) => (
          <PlaceCard key={restaurant.id} restaurant={restaurant} />
        ))}
      </BottomSheetScrollView>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  background: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
})
