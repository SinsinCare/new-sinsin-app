import { useState, useRef, useEffect } from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { floatingAiButtonScrollInset } from "@/src/shared/components/floatingAiButtonLayout"
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
import { useV2Theme, V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
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
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()

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
        contentContainerStyle={[
          styles.scrollContent,
          // 필이 덮는 높이는 화면 바닥 기준이다(floatingAiButtonScrollInset 머리말).
          { paddingBottom: floatingAiButtonScrollInset(insets.bottom, 24) },
        ]}
        stickyHeaderIndices={[1]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* index 0: 헤더 (주간 네비 + 달력) */}
        <V2VStack gap={12} paddingBottom={8}>
          <V2HStack justify="center" align="center" gap={12}>
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
              <V2HStack align="center" gap={8}>
                <V2Text token="title.small" color={colors.label.strong}>
                  {getWeekLabel(selectedDate, i18n.language)}
                </V2Text>
                <Ionicons name="calendar-outline" size={18} color="#999" />
              </V2HStack>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={goToNextWeek}
              accessibilityRole="button"
              accessibilityLabel={t("stats.nextWeek")}
            >
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          </V2HStack>
          <WeekCalendar
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            recordedDates={recordedDates}
            disableFuture
          />
        </V2VStack>

        {/* index 1: sticky 탭바 */}
        <V2VStack
          onLayout={(e) => {
            tabBarHeight.current = e.nativeEvent.layout.height
          }}
        >
          <StatisticsTabBar
            selectedTab={selectedTab}
            onSelectTab={handleTabPress}
          />
          <View style={{ height: 1, backgroundColor: colors.line.normal }} />
        </V2VStack>

        {/* 섹션 - 기록 없으면 빈 상태, 있으면 모두 렌더링 */}
        {isEmpty || isLoading ? (
          <V2VStack
            justify="center"
            align="center"
            gap={16}
            style={{ minHeight: windowHeight * 0.45 }}
          >
            <Icon name="circle-character" size={40} />
            <V2Text
              color={colors.label.neutral}
              style={{ fontSize: 14, fontWeight: "600" }}
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
            >
              {t("stats.emptyPeriod")}
            </V2Text>
            <TouchableOpacity onPress={onGoToRecord}>
              <V2Text
                color={colors.label.neutral}
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  backgroundColor: colors.fill.normal,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 16,
                }}
              >
                {t("stats.logMeal")}
              </V2Text>
            </TouchableOpacity>
          </V2VStack>
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

            {/* 통계에서 여는 것도 **저장된 기록**이다 — 신규 결과와 같은 칸에 담기면
                '결과를 보고도 안 담았다' 가 담을 것이 없는 화면까지 세게 된다. */}
            <FoodAnalysisResult
              source="saved"
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
  },
})
