import { ThemedView } from "@/components/themed-view"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { HomeHeader } from "@/src/features/home/components/HomeHeader"
import { useCallback, useRef, useState } from "react"
import { MainTab } from "@/src/features/home/types"
import { RecordView } from "@/src/features/home/components/record/RecordView"
import { StatisticsView } from "@/src/features/home/components/statistics/StatisticsView"
import { MonthCalendarSheet } from "@/src/features/home/components/statistics/MonthCalendarSheet"
import { useFocusEffect } from "@react-navigation/native"
import {
  Animated,
  PanResponder,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native"
import { tokens } from "@/src/theme/tokens"
import { useSelectedDateStore } from "@/src/stores"
import {
  AnnouncementPopupModal,
  useAnnouncementOnEntry,
} from "@/src/features/announcement"
import {
  getCommittedHomePagerValue,
  getReleasedHomePagerTab,
} from "@/src/features/home/utils/homePager"

const PADDING = 25

export default function HomeScreen() {
  const [mainTab, setMainTab] = useState<MainTab>("record")
  const selectedDate = useSelectedDateStore((state) => state.selectedDate)
  const setSelectedDate = useSelectedDateStore((state) => state.setSelectedDate)
  const [showCalendar, setShowCalendar] = useState(false)
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const announcement = useAnnouncementOnEntry(true)
  const widthRef = useRef(width)
  widthRef.current = width

  const tabAnim = useRef(new Animated.Value(0)).current
  const mainTabRef = useRef<MainTab>("record")

  const animateToCommittedTab = useCallback(() => {
    Animated.spring(tabAnim, {
      toValue: getCommittedHomePagerValue(mainTabRef.current),
      useNativeDriver: true,
      tension: 100,
      friction: 14,
    }).start()
  }, [tabAnim])

  const alignToCommittedTab = useCallback(() => {
    tabAnim.stopAnimation()
    tabAnim.setValue(getCommittedHomePagerValue(mainTabRef.current))
  }, [tabAnim])

  useFocusEffect(
    useCallback(() => {
      alignToCommittedTab()
    }, [alignToCommittedTab]),
  )

  const switchTab = (tab: MainTab) => {
    mainTabRef.current = tab
    setMainTab(tab)
    animateToCommittedTab()
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, { dx }) => {
        const base = mainTabRef.current === "record" ? 0 : 1
        const newVal = Math.max(0, Math.min(1, base - dx / widthRef.current))
        tabAnim.setValue(newVal)
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        const settledTab = getReleasedHomePagerTab({
          current: mainTabRef.current,
          dx,
          vx,
          width: widthRef.current,
        })

        mainTabRef.current = settledTab
        setMainTab(settledTab)
        animateToCommittedTab()
      },
      onPanResponderTerminate: animateToCommittedTab,
    }),
  ).current

  const recordTranslateX = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -width],
  })
  const statsTranslateX = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [width, 0],
  })

  return (
    <ThemedView
      lightColor={tokens.color.appBg.val}
      darkColor={tokens.color.appBgDark.val}
      style={styles.container}
    >
      <HomeHeader
        topInset={insets.top}
        mainTab={mainTab}
        onChangeTab={switchTab}
        selectedDate={selectedDate}
        onDatePress={() => setShowCalendar(true)}
      />

      <MonthCalendarSheet
        visible={showCalendar}
        selectedDate={selectedDate}
        onSelectDate={(date) => {
          setSelectedDate(date)
          setShowCalendar(false)
        }}
        onClose={() => setShowCalendar(false)}
        disableFuture
      />

      <View style={styles.tabContent} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              paddingHorizontal: PADDING,
              transform: [{ translateX: recordTranslateX }],
            },
          ]}
        >
          <RecordView
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onSelectMealType={() => {}}
          />
        </Animated.View>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              paddingHorizontal: PADDING,
              transform: [{ translateX: statsTranslateX }],
            },
          ]}
        >
          <StatisticsView
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onGoToRecord={() => switchTab("record")}
            isActive={mainTab === "stats"}
          />
        </Animated.View>
      </View>

      <AnnouncementPopupModal
        visible={announcement.visible}
        notice={announcement.activeNotice}
        onClose={announcement.close}
      />
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: PADDING,
    overflow: "hidden",
  },
  tabContent: {
    flex: 1,
    marginHorizontal: -PADDING,
    overflow: "hidden",
  },
})
