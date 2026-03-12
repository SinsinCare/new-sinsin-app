import { useCallback, useMemo, useState } from "react"
import { StyleSheet, useColorScheme } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet"
import { PlaceFilterChips } from "./PlaceFilterChips"
import { PlaceFilterModal } from "./PlaceFilterModal"
import { PlaceCard } from "./PlaceCard"
import { MOCK_PLACE_RESTAURANTS } from "../data/curationData"
import { DEFAULT_FILTER_STATE } from "../data/filterData"
import type { FilterState, FilterTab } from "../types"

export function PlaceSheet() {
  const isDarkMode = useColorScheme() === "dark"
  const insets = useSafeAreaInsets()
  const snapPoints = useMemo(() => ["40%", "100%"], [])

  const backgroundColor = isDarkMode ? "#1F1F21" : "#FCFCFC"
  const handleColor = isDarkMode ? "#555555" : "#C4C4C4"

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE)
  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>("region")

  const handleFilterPress = useCallback((filterKey: FilterTab) => {
    setActiveFilterTab(filterKey)
    setFilterModalVisible(true)
  }, [])

  const handleApplyFilters = useCallback((newFilters: FilterState) => {
    setFilters(newFilters)
    // TODO: 필터링 로직 연결
  }, [])

  return (
    <>
      <BottomSheet
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={[styles.background, { backgroundColor }]}
        handleIndicatorStyle={[styles.handle, { backgroundColor: handleColor }]}
      >
        <PlaceFilterChips onFilterPress={handleFilterPress} />
        <BottomSheetScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom }}
        >
          {MOCK_PLACE_RESTAURANTS.map((restaurant) => (
            <PlaceCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </BottomSheetScrollView>
      </BottomSheet>
      <PlaceFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        initialFilters={filters}
        initialTab={activeFilterTab}
        onApply={handleApplyFilters}
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
