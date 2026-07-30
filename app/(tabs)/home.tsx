import { router } from "expo-router"
import { useEffect, useState } from "react"
import { StyleSheet } from "react-native"

import { ThemedView } from "@/components/themed-view"
import {
  AnnouncementPopupModal,
  useAnnouncementOnEntry,
} from "@/src/features/announcement"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { RecordView } from "@/src/features/home/components/record/RecordView"
import { MonthCalendarSheet } from "@/src/features/home/components/statistics/MonthCalendarSheet"
import { useSelectedDateStore } from "@/src/stores"
import { tokens } from "@/src/theme/tokens"

/**
 * 홈 = 기록 하나.
 *
 * 예전에는 통계가 옆 페이지로 항상 마운트되어(좌우 스와이프 페이저)
 * 안 보는 화면의 쿼리·렌더 비용을 늘 냈다. 통계는 /statistics 로 분리했고,
 * 홈은 기록에만 집중한다 — 페이저·스와이프 제스처도 함께 걷어냈다.
 */
export default function HomeScreen() {
  const selectedDate = useSelectedDateStore((state) => state.selectedDate)
  const setSelectedDate = useSelectedDateStore((state) => state.setSelectedDate)
  const [showCalendar, setShowCalendar] = useState(false)
  const announcement = useAnnouncementOnEntry(true)

  useEffect(() => {
    trackAnalyticsEvent("home_record_viewed", {})
  }, [])

  return (
    <ThemedView
      lightColor={tokens.color.appBg.val}
      darkColor={tokens.color.appBgDark.val}
      style={styles.container}
    >
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

      <RecordView
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onSelectMealType={() => {}}
        onPressDate={() => setShowCalendar(true)}
        onOpenStats={() => router.push("/statistics")}
      />

      <AnnouncementPopupModal
        visible={announcement.visible}
        notice={announcement.activeNotice}
        onClose={announcement.close}
      />
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})
