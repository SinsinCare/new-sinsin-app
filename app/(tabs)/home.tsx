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
import { startOfDay } from "@/src/features/stats-report/utils/presentation"
import { useRegisterTabReset } from "@/src/shared/navigation"
import { useSelectedDateStore } from "@/src/stores"
import { tokens } from "@/src/theme/tokens"

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * 고른 날짜를 **범주**로 접는다. 원시 날짜는 실을 수 없다 — `date` 가 들어간 키는
 * 새니타이저가 조용히 떨구고(events.ts), 실렸더라도 하루에 한 값씩 늘어 브레이크다운이
 * `limit N` 에 잘려 나간다(설계 §2 P4).
 *
 * 자정 경계 흔들림을 피하려고 자정 기준으로 뺀다 — 시각을 그대로 빼면 같은 '어제' 가
 * 오전에는 `0`, 저녁에는 `1_7` 로 갈린다.
 */
function toDaysBackBucket(
  selected: Date,
  today: Date,
): "0" | "1_7" | "8_30" | "over_30" {
  const days = Math.round(
    (startOfDay(today).getTime() - startOfDay(selected).getTime()) / DAY_MS,
  )
  if (days <= 0) return "0"
  if (days <= 7) return "1_7"
  if (days <= 30) return "8_30"
  return "over_30"
}

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

  /*
    홈 탭을 다시 눌렀을 때 **먼저** 할 일 하나 — 열려 있는 달력 시트를 닫는다.
    나머지(맨 위로 · 새로고침)는 `RecordView` 가 등록한다. 두 등록은 능력별로 합쳐진다.

    공지 팝업은 **넣지 않는다.** 그것을 닫는 것은 "읽었다" 로 기록되는 동작이라
    (`announcement.close`), 탭을 누른 사람이 시킨 적 없는 결과가 남는다.
  */
  useRegisterTabReset("home", {
    overlay: {
      isOpen: () => showCalendar,
      close: () => setShowCalendar(false),
    },
  })

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
          /*
            지난 날짜를 보는 사람은 기록 CTA 를 누르지 않는다. 이 한 행이 없으면
            그 조회가 전부 '홈에 왔는데 기록 안 함' 으로 세어져 이탈률이 부풀려진다.
          */
          const days_back = toDaysBackBucket(date, new Date())
          trackAnalyticsEvent("home_date_selected", {
            is_today: days_back === "0",
            days_back,
          })
          setSelectedDate(date)
          setShowCalendar(false)
        }}
        onClose={() => setShowCalendar(false)}
        disableFuture
      />

      <RecordView
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onPressDate={() => setShowCalendar(true)}
        onOpenStats={() => router.push("/statistics")}
        onOpenNotifications={() => router.push("/(settings)/notifications")}
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
