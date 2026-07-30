import { useCallback, useMemo, useState } from "react"
import { StyleSheet } from "react-native"
import { Text, YStack } from "tamagui"
import { useTranslation } from "react-i18next"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"
import { Button } from "@/src/shared/components"
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
  isError?: boolean
  onRetry?: () => void
}

export function PlaceSheet({
  restaurants,
  filters,
  onFiltersChange,
  isError = false,
  onRetry,
}: PlaceSheetProps) {
  const { t } = useTranslation("common")
  const isDarkMode = useAppColorScheme() === "dark"
  const insets = useSafeAreaInsets()
  const snapPoints = useMemo(() => ["40%", "100%"], [])

  const backgroundColor = isDarkMode
    ? tokens.color.appBgDark.val
    : tokens.color.offWhite.val
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
          {restaurants.length > 0 ? (
            restaurants.map((restaurant) => (
              <PlaceCard key={restaurant.id} restaurant={restaurant} />
            ))
          ) : (
            <YStack
              alignItems="center"
              gap={8}
              paddingHorizontal={24}
              paddingVertical={32}
            >
              <Text
                fontFamily="$body"
                fontSize={16}
                fontWeight="700"
                textAlign="center"
              >
                {t(
                  isError
                    ? "restaurant.loadErrorTitle"
                    : "restaurant.emptyTitle",
                )}
              </Text>
              <Text
                fontFamily="$body"
                fontSize={14}
                color="$colorSubtle"
                textAlign="center"
              >
                {t(
                  isError ? "restaurant.loadErrorBody" : "restaurant.emptyBody",
                )}
              </Text>
              {isError && onRetry ? (
                <Button onPress={onRetry}>{t("restaurant.reload")}</Button>
              ) : null}
            </YStack>
          )}
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
