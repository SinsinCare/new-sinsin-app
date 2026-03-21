import { useCallback, useMemo, useState } from "react"
import { StyleSheet, useColorScheme } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet"
import { PlaceFilterChips } from "./PlaceFilterChips"
import { PlaceFilterModal } from "./PlaceFilterModal"
import { PlaceCard } from "./PlaceCard"
import type { FilterState, FilterTab, PlaceRestaurant } from "../types"

interface PlaceSheetProps {
  restaurants: PlaceRestaurant[]
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
}

export function PlaceSheet({ restaurants, filters, onFiltersChange }: PlaceSheetProps) {
  const isDarkMode = useColorScheme() === "dark"
  const insets = useSafeAreaInsets()
  const snapPoints = useMemo(() => ["40%", "100%"], [])

  const backgroundColor = isDarkMode ? "#1F1F21" : "#FCFCFC"
  const handleColor = isDarkMode ? "#555555" : "#C4C4C4"

  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>("region")

  const handleFilterPress = useCallback((filterKey: FilterTab) => {
    setActiveFilterTab(filterKey)
    setFilterModalVisible(true)
  }, [])

  return (
    <>
      <BottomSheet
        index={0}
        snapPoints={snapPoints}
        topInset={insets.top}
        backgroundStyle={[styles.background, { backgroundColor }]}
        handleIndicatorStyle={[styles.handle, { backgroundColor: handleColor }]}
        enableContentPanningGesture={false}
      >
        <PlaceFilterChips onFilterPress={handleFilterPress} />
        <BottomSheetScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom }}
        >
          {restaurants.map((restaurant) => (
            <PlaceCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </BottomSheetScrollView>
      </BottomSheet>
      <PlaceFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        initialFilters={filters}
        initialTab={activeFilterTab}
        onApply={onFiltersChange}
      />
    </>
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
