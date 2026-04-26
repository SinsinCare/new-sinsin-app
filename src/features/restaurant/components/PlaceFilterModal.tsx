import { useCallback, useRef, useState } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, useColorScheme, View } from "react-native"
import { Text, YStack } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { FilterTabBar } from "./FilterTabBar"
import { RegionFilterSection } from "./RegionFilterSection"
import { FoodTypeFilterSection } from "./FoodTypeFilterSection"
import { NutrientFilterSection } from "./NutrientFilterSection"
import type { FilterState, FilterTab } from "../types"

interface PlaceFilterModalProps {
  visible: boolean
  onClose: () => void
  initialFilters: FilterState
  initialTab?: FilterTab
  onApply: (filters: FilterState) => void
}

export function PlaceFilterModal({
  visible,
  onClose,
  initialFilters,
  initialTab = "region",
  onApply,
}: PlaceFilterModalProps) {
  const isDarkMode = useColorScheme() === "dark"
  const insets = useSafeAreaInsets()
  const scrollRef = useRef<ScrollView>(null)

  const [activeTab, setActiveTab] = useState<FilterTab>(initialTab)
  const [filters, setFilters] = useState<FilterState>(initialFilters)

  // Section Y positions for scroll-to
  const sectionPositions = useRef<Record<FilterTab, number>>({
    region: 0,
    foodType: 0,
    nutrient: 0,
  })

  const backgroundColor = isDarkMode ? tokens.color.appBgDark.val : "#FDFDFD"
  const dividerColor = isDarkMode ? "#2A2A30" : "#FAFAFA"

  // Reset local state when modal opens
  const handleShow = useCallback(() => {
    setFilters(initialFilters)
    setActiveTab(initialTab)
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: sectionPositions.current[initialTab],
        animated: false,
      })
    }, 100)
  }, [initialFilters, initialTab])

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab)
    scrollRef.current?.scrollTo({
      y: sectionPositions.current[tab],
      animated: true,
    })
  }

  const handleApply = () => {
    onApply(filters)
    onClose()
  }

  // Region handlers
  const handleRegionChange = (region: string | null) => {
    setFilters((prev) => ({
      ...prev,
      region,
      subRegions: region !== prev.region ? [] : prev.subRegions,
    }))
  }

  const handleSubRegionToggle = (subRegion: string) => {
    setFilters((prev) => ({
      ...prev,
      subRegions: prev.subRegions.includes(subRegion)
        ? prev.subRegions.filter((s) => s !== subRegion)
        : [...prev.subRegions, subRegion],
    }))
  }

  const handleRegionReset = () => {
    setFilters((prev) => ({ ...prev, region: null, subRegions: [] }))
  }

  // Food type handler
  const handleFoodTypeToggle = (foodType: string) => {
    setFilters((prev) => ({
      ...prev,
      foodTypes: prev.foodTypes.includes(foodType)
        ? prev.foodTypes.filter((f) => f !== foodType)
        : [...prev.foodTypes, foodType],
    }))
  }

  // Nutrient handlers
  const handleNutrientToggle = (nutrient: string) => {
    setFilters((prev) => ({
      ...prev,
      nutrients: prev.nutrients.includes(nutrient)
        ? prev.nutrients.filter((n) => n !== nutrient)
        : [...prev.nutrients, nutrient],
    }))
  }

  const handleNutrientReset = () => {
    setFilters((prev) => ({ ...prev, nutrients: [] }))
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onShow={handleShow}
    >
      <YStack flex={1} backgroundColor={backgroundColor}>
        <FilterTabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onClose={onClose}
        />
        <ScrollView ref={scrollRef} style={styles.scrollView}>
          <View
            onLayout={(e) => {
              sectionPositions.current.region = e.nativeEvent.layout.y
            }}
          >
            <RegionFilterSection
              selectedRegion={filters.region}
              selectedSubRegions={filters.subRegions}
              onRegionChange={handleRegionChange}
              onSubRegionToggle={handleSubRegionToggle}
              onReset={handleRegionReset}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          <View
            onLayout={(e) => {
              sectionPositions.current.foodType = e.nativeEvent.layout.y
            }}
          >
            <FoodTypeFilterSection
              selectedFoodTypes={filters.foodTypes}
              onToggle={handleFoodTypeToggle}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          <View
            onLayout={(e) => {
              sectionPositions.current.nutrient = e.nativeEvent.layout.y
            }}
          >
            <NutrientFilterSection
              selectedNutrients={filters.nutrients}
              onToggle={handleNutrientToggle}
              onReset={handleNutrientReset}
            />
          </View>
        </ScrollView>

        {/* Apply Button */}
        <View style={[styles.applyContainer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable onPress={handleApply} style={styles.applyButton}>
            <Text
              fontFamily="$body"
              fontWeight="600"
              fontSize={16}
              color="#FDFDFD"
            >
              필터 적용하기
            </Text>
          </Pressable>
        </View>
      </YStack>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  divider: {
    height: 8,
  },
  applyContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  applyButton: {
    backgroundColor: tokens.color.primaryAccent.val,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
})
