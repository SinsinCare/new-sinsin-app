import { useState, useRef, useEffect } from "react"
import {
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
  AppState,
  type AppStateStatus,
} from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text, XStack, YStack } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { IntakeSummary } from "./IntakeSummary"
import { DietaryGuide } from "./DietaryGuide"
import { DietaryRecord } from "./DietaryRecord"
import { WeekCalendar } from "./WeekCalendar"
import { MealType, StatisticsTab } from "../../types"
import { WeightEdemaResult } from "./WeightEdemaResult"
import { GlucoseTrendSection } from "./GlucoseTrendSection"
import { useGlucoseWeek } from "../../hooks/useGlucoseWeek"
import { toDateStr } from "../../utils/dateUtils"
import { StatisticsTabBar } from "./StatisticsTabBar"
import { getWeekLabel } from "../../utils/getWeekDays"
import { useDateAnalysis } from "../../hooks/useDateAnalysis"
import { useDiaryExistence } from "../../hooks/useDiaryExistence"
import { useFoodAnalysis } from "../../hooks/useFoodAnalysis"
import { FoodAnalysisResult } from "../FoodAnalysisResult"
import type { DiaryAnalysisResult } from "@/src/types"
import { Icon } from "@/src/shared/components"
import { MonthCalendarSheet } from "./MonthCalendarSheet"
import { isSkippedDiet } from "../../utils/mealRecordUtils"
import { useTranslation } from "react-i18next"

const TAB_ORDER: StatisticsTab[] = [
  "intake",
  "guide",
  "record",
  "weight",
  "glucose",
]

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

const isAfterToday = (date: Date) => startOfDay(date) > startOfDay(new Date())

const clampToToday = (date: Date) => (isAfterToday(date) ? new Date() : date)

interface StatisticsViewProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onGoToRecord: () => void
  isActive: boolean
}

export function StatisticsView({
  selectedDate,
  onSelectDate,
  onGoToRecord,
  isActive,
}: StatisticsViewProps) {
  const { t, i18n } = useTranslation()
  const [selectedTab, setSelectedTab] = useState<StatisticsTab>("intake")
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [diaryResult, setDiaryResult] = useState<DiaryAnalysisResult | null>(
    null,
  )
  const [diaryId, setDiaryId] = useState<number | null>(null)
  const [isResultOpen, setIsResultOpen] = useState(false)
  const [resultMealType, setResultMealType] = useState<MealType | undefined>()
  const scrollRef = useRef<ScrollView>(null)
  const tabBarHeight = useRef(0)
  const sectionOffsets = useRef<Partial<Record<StatisticsTab, number>>>({})
  const isProgrammaticScroll = useRef(false)
  const { data, isLoading, refetch } = useDateAnalysis(selectedDate)
  // 혈당 추이는 선택한 날로 끝나는 7일 창을 본다. 통계 탭이 떠 있을 때만 부른다.
  const selectedDateStr = toDateStr(selectedDate)
  const glucoseWeek = useGlucoseWeek(selectedDateStr, isActive)
  const { data: recordedDates = [] } = useDiaryExistence(selectedDate)
  const { height: windowHeight } = useWindowDimensions()
  const {
    updateFoodAnalysis,
    updateDiaryMealType,
    fetchDiaryResult,
    isUpdating,
  } = useFoodAnalysis((updated) => {
    setDiaryResult((prev) =>
      prev
        ? {
            ...prev,
            ...updated,
            imageUrl: updated.imageUrl ?? prev.imageUrl,
          }
        : null,
    )
  })

  const hasDiets = (data?.result.diets.length ?? 0) > 0
  const isEmpty = !isLoading && !hasDiets
  const isDarkMode = useAppColorScheme() === "dark"

  useEffect(() => {
    if (!isActive) return

    let interval: ReturnType<typeof setInterval> | null = null
    let refreshInFlight = false

    const refreshOnce = async () => {
      if (refreshInFlight) return
      refreshInFlight = true
      try {
        await refetch()
      } finally {
        refreshInFlight = false
      }
    }
    const stopPolling = () => {
      if (interval !== null) clearInterval(interval)
      interval = null
    }
    const startPolling = () => {
      if (interval !== null) return
      void refreshOnce()
      interval = setInterval(() => void refreshOnce(), 30_000)
    }
    const handleAppState = (state: AppStateStatus) => {
      if (state === "active") startPolling()
      else stopPolling()
    }

    if (AppState.currentState === "active") startPolling()
    const subscription = AppState.addEventListener("change", handleAppState)
    return () => {
      stopPolling()
      subscription.remove()
    }
  }, [isActive, refetch])

  const handleDietCardPress = async (mealType: MealType) => {
    const diet = data?.result.diets.find((d) => d.mealType === mealType)
    if (!diet) return
    if (diet.diaryId === null || isSkippedDiet(diet)) {
      onGoToRecord()
      return
    }
    const result = await fetchDiaryResult(diet.diaryId)
    if (result) {
      setDiaryResult(result)
      setDiaryId(diet.diaryId)
      setResultMealType(mealType)
      setIsResultOpen(true)
    }
  }

  const handleMealTypeChange = ({ toMealType }: { toMealType: MealType }) => {
    setResultMealType(toMealType)
    void refetch()
  }

  const goToPrevWeek = () => {
    const prev = new Date(selectedDate)
    prev.setDate(prev.getDate() - 7)
    onSelectDate(prev)
  }

  const goToNextWeek = () => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + 7)
    if (isAfterToday(selectedDate)) {
      onSelectDate(new Date())
      return
    }
    onSelectDate(clampToToday(next))
  }

  const handleSelectDate = (date: Date) => {
    if (isAfterToday(date)) return
    onSelectDate(date)
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
    <>
      <ScrollView
        bounces={false}
        overScrollMode="never"
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
            <TouchableOpacity
              onPress={goToPrevWeek}
              accessibilityRole="button"
              accessibilityLabel={t("stats.previousWeek")}
            >
              <Ionicons name="chevron-back" size={18} color="#999" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsCalendarOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t("stats.openCalendar")}
            >
              <XStack alignItems="center" gap="$2">
                <Text
                  fontSize="$5"
                  fontWeight="600"
                  color={isDarkMode ? "$textDark" : "$black"}
                >
                  {getWeekLabel(selectedDate, i18n.language)}
                </Text>
                <Ionicons name="calendar-outline" size={18} color="#999" />
              </XStack>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={goToNextWeek}
              accessibilityRole="button"
              accessibilityLabel={t("stats.nextWeek")}
            >
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          </XStack>
          <WeekCalendar
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            recordedDates={recordedDates}
            disableFuture
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

        {/* 섹션 - 기록 없으면 빈 상태, 있으면 모두 렌더링 */}
        {isEmpty || isLoading ? (
          <YStack
            minHeight={windowHeight * 0.45}
            justifyContent="center"
            alignItems="center"
            gap="$4"
          >
            <Icon name="circle-character" size={40} />
            <Text fontSize="$4" fontWeight="600" color="$colorSubtle">
              {t("stats.emptyPeriod")}
            </Text>
            <TouchableOpacity onPress={onGoToRecord}>
              <Text
                fontSize="$4"
                color="$colorSubtle"
                fontWeight="600"
                backgroundColor={
                  isDarkMode ? "$cardBgDark" : "$backgroundFocus"
                }
                paddingHorizontal="$3"
                paddingVertical="$2.5"
                borderRadius="$8"
              >
                {t("stats.logMeal")}
              </Text>
            </TouchableOpacity>
          </YStack>
        ) : (
          <>
            <View
              onLayout={(e) => {
                sectionOffsets.current.intake = e.nativeEvent.layout.y
              }}
            >
              <IntakeSummary analysis={data?.result.analysis ?? null} />
            </View>
            <View
              onLayout={(e) => {
                sectionOffsets.current.guide = e.nativeEvent.layout.y
              }}
            >
              <DietaryGuide
                dietaryGuide={data?.result.analysis?.dietaryGuide}
                cautionFoods={data?.result.analysis?.cautionFoods}
              />
            </View>
            <View
              onLayout={(e) => {
                sectionOffsets.current.record = e.nativeEvent.layout.y
              }}
            >
              <DietaryRecord
                diets={data?.result.diets ?? []}
                onSelectMealType={handleDietCardPress}
              />
            </View>

            <FoodAnalysisResult
              result={diaryResult}
              open={isResultOpen}
              onClose={() => setIsResultOpen(false)}
              imageUri={diaryResult?.imageUrl}
              mealType={resultMealType}
              showAddButton={false}
              isUpdating={isUpdating}
              updateFoodAnalysis={updateFoodAnalysis}
              diaryId={diaryId ?? undefined}
              updateDiaryMealType={updateDiaryMealType}
              onMealTypeChange={handleMealTypeChange}
            />

            <View
              onLayout={(e) => {
                sectionOffsets.current.weight = e.nativeEvent.layout.y
              }}
            >
              <WeightEdemaResult bodyRecords={data?.result.bodyRecords} />
            </View>

            <View
              onLayout={(e) => {
                sectionOffsets.current.glucose = e.nativeEvent.layout.y
              }}
            >
              <GlucoseTrendSection
                records={glucoseWeek.data}
                selectedDate={selectedDateStr}
                isLoading={glucoseWeek.isLoading}
              />
            </View>
          </>
        )}
      </ScrollView>

      <MonthCalendarSheet
        visible={isCalendarOpen}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        onClose={() => setIsCalendarOpen(false)}
        disableFuture
      />
    </>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 10,
    // 우하단 AI 상담 필(16+48)에 마지막 카드가 가리지 않게 그 높이만큼 비운다.
    paddingBottom: 88,
  },
})
