import Ionicons from "@expo/vector-icons/Ionicons"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import { ThemedView } from "@/components/themed-view"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { StatsReportScreen } from "@/src/features/stats-report/components/StatsReportScreen"
import type { PeriodType } from "@/src/features/stats-report/types/report"
import { useSurface } from "@/src/hooks/useSurface"
import { useSelectedDateStore } from "@/src/stores"
import { tokens } from "@/src/theme/tokens"

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

const clampToToday = (date: Date) =>
  startOfDay(date) > startOfDay(new Date()) ? new Date() : date

/**
 * 통계 — 홈에서 분리된 전용 페이지. 통계 리포트(일/주/월)를 그린다.
 *
 * 기간 상태(period·anchorDate)는 이 페이지가 소유한다. 시작 날짜만 홈의
 * 선택 날짜 스토어에서 **읽어** 이어받고, 여기서의 ‹ › 이동을 스토어에
 * 되쓰지 않는다 — 리포트 기간 탐색이 홈 캘린더를 끌고 다니면 안 된다.
 */
export default function StatisticsScreen() {
  const { t } = useTranslation("common")
  const insets = useSafeAreaInsets()
  const surface = useSurface()
  const [period, setPeriod] = useState<PeriodType>("day")
  // 초기값 한 번만 스토어에서 읽는다(useState initializer) — 이후엔 독립.
  const [anchorDate, setAnchorDate] = useState<Date>(() =>
    clampToToday(useSelectedDateStore.getState().selectedDate),
  )

  // 홈 페이저 시절의 이벤트 이름을 그대로 유지한다 — 대시보드 연속성.
  useEffect(() => {
    trackAnalyticsEvent("home_statistics_viewed", {})
  }, [])

  return (
    <ThemedView
      lightColor={tokens.color.appBg.val}
      darkColor={tokens.color.appBgDark.val}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("action.back")}
          // 리로드·딥링크로 이 페이지가 첫 화면이면 히스토리가 없다 —
          // back 은 GO_BACK 미처리 에러를 내므로 홈으로 대체한다.
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)/home")
          }
          hitSlop={10}
          style={({ pressed }) => [
            styles.backButton,
            { opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <Ionicons name="chevron-back" size={24} color={surface.textStrong} />
        </Pressable>
        <Text style={[styles.title, { color: surface.textStrong }]}>
          {t("stats.title")}
        </Text>
        {/* 좌우 균형용 — 타이틀을 정확히 가운데 둔다 */}
        <View style={styles.backButton} />
      </View>

      <View style={styles.body}>
        <StatsReportScreen
          period={period}
          anchorDate={anchorDate}
          onChangePeriod={setPeriod}
          onChangeAnchorDate={setAnchorDate}
        />
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    height: undefined,
  },
  backButton: {
    width: 44,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.34,
    fontWeight: "700",
  },
  body: { flex: 1 },
})
