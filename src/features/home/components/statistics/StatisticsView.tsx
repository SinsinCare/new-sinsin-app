import { useState, useRef } from "react"
import {
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native"
import { Text, XStack, YStack } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { IntakeSummary } from "./IntakeSummary"
import { DietaryGuide } from "./DietaryGuide"
import { DietaryRecord } from "./DietaryRecord"
import { WeekCalendar } from "./WeekCalendar"
import { MealType, StatisticsTab } from "../../types"
import { WeightEdemaResult } from "./WeightEdemaResult"
import { StatisticsTabBar } from "./StatisticsTabBar"
import { getWeekLabel } from "../../utils/getWeekDays"

const TAB_ORDER: StatisticsTab[] = ["intake", "guide", "record", "weight"]

interface StatisticsViewProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  selectedMealType: MealType | null
  onSelectMealType: (mealType: MealType) => void
}

export function StatisticsView({
  selectedDate,
  onSelectDate,
  selectedMealType,
  onSelectMealType,
}: StatisticsViewProps) {
  const [selectedTab, setSelectedTab] = useState<StatisticsTab>("intake")
  const scrollRef = useRef<ScrollView>(null)
  const tabBarHeight = useRef(0)
  const sectionOffsets = useRef<Partial<Record<StatisticsTab, number>>>({})
  const isProgrammaticScroll = useRef(false)

  const goToPrevWeek = () => {
    const prev = new Date(selectedDate)
    prev.setDate(prev.getDate() - 7)
    onSelectDate(prev)
  }

  const goToNextWeek = () => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + 7)
    onSelectDate(next)
  }

  const handleTabPress = (tab: StatisticsTab) => {
    setSelectedTab(tab)
    const offset = sectionOffsets.current[tab]
    if (offset !== undefined) {
      isProgrammaticScroll.current = true
      scrollRef.current?.scrollTo({
        y: Math.max(0, offset - tabBarHeight.current),
        animated: true,
      })
      setTimeout(() => {
        isProgrammaticScroll.current = false
      }, 500)
    }
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isProgrammaticScroll.current) return
    const scrollY = event.nativeEvent.contentOffset.y
    let activeTab: StatisticsTab = "intake"
    for (let i = TAB_ORDER.length - 1; i >= 0; i--) {
      const offset = sectionOffsets.current[TAB_ORDER[i]]
      if (offset !== undefined && scrollY + tabBarHeight.current >= offset) {
        activeTab = TAB_ORDER[i]
        break
      }
    }
    setSelectedTab(activeTab)
  }

  return (
    <ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      stickyHeaderIndices={[1]}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      {/* index 0: 헤더 (주간 네비 + 달력) */}
      <YStack gap="$3" paddingBottom="$2">
        <XStack justifyContent="center" alignItems="center" gap="$3">
          <TouchableOpacity onPress={goToPrevWeek}>
            <Ionicons name="chevron-back" size={18} color="#999" />
          </TouchableOpacity>
          <XStack alignItems="center" gap="$2">
            <Text fontSize="$5" fontWeight="600">
              {getWeekLabel(selectedDate)}
            </Text>
            <Ionicons name="calendar-outline" size={18} color="#999" />
          </XStack>
          <TouchableOpacity onPress={goToNextWeek}>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>
        </XStack>
        <WeekCalendar
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
          recordedDates={[13, 14, 15]}
        />
      </YStack>

      {/* index 1: sticky 탭바 */}
      <YStack
        onLayout={(e) => {
          tabBarHeight.current = e.nativeEvent.layout.height
        }}
      >
        <StatisticsTabBar
          selectedTab={selectedTab}
          onSelectTab={handleTabPress}
        />
        <YStack height={1} backgroundColor="$gray4" />
      </YStack>

      {/* 섹션 - 모두 렌더링, 탭은 스크롤 이동 */}
      <View
        onLayout={(e) => {
          sectionOffsets.current.intake = e.nativeEvent.layout.y
        }}
      >
        <IntakeSummary />
      </View>
      <View
        onLayout={(e) => {
          sectionOffsets.current.guide = e.nativeEvent.layout.y
        }}
      >
        <DietaryGuide />
      </View>
      <View
        onLayout={(e) => {
          sectionOffsets.current.record = e.nativeEvent.layout.y
        }}
      >
        <DietaryRecord
          selectedMealType={selectedMealType}
          onSelectMealType={onSelectMealType}
        />
      </View>
      <View
        onLayout={(e) => {
          sectionOffsets.current.weight = e.nativeEvent.layout.y
        }}
      >
        <WeightEdemaResult />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 100,
  },
})
