import Ionicons from "@expo/vector-icons/Ionicons"
import { useEffect, useRef, type ReactNode } from "react"
import {
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native"
import { Text } from "@/src/shared/components/AppText"
import { useTranslation } from "react-i18next"

import { useLoadingVisible } from "@/src/design-system-v2"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { useReportSurface } from "../hooks/useReportSurface"
import { resolveError, toAnalyticsFailKind } from "@/src/lib/errorMessage"
import {
  startOfDay,
  toDateKey,
  periodStart,
  shiftAnchor,
  fallbackTitle,
} from "../utils/presentation"
import { ReportContent } from "./ReportContent"
import { PeriodSegment, NavButton } from "./ReportControls"
import { LoadingSkeleton, ErrorCard } from "./ReportStates"
import { LAYOUT } from "@/src/theme/surface"

import { useStatsReport } from "../hooks/useStatsReport"
import type { PeriodType } from "../types/report"

/* ─── 날짜 계산 ───────────────────────────────────────────────────
 * 기간의 정의(월요일 시작 주, 달력 월)는 서버와 같은 규칙이어야 한다 —
 * 여기서 어긋나면 ‹ › 로 이동한 기간과 서버가 계산한 기간이 달라진다. */

/* ─── 화면 ───────────────────────────────────────────────────── */

/**
 * 통계 리포트 화면 — 세그먼트(일/주/월) + 기간 ‹ › 내비 + 섹션 조립.
 *
 * 기간 상태는 페이지(app/statistics.tsx)가 소유하고 여기는 그린다.
 * 섹션은 계약의 렌더 조건 그대로 — null 인 섹션은 그리지 않는다.
 * 어떤 섹션이 오는지는 서버가 정하므로 화면은 기간별 분기를 갖지 않는다.
 */
export function StatsReportScreen({
  period,
  anchorDate,
  onChangePeriod,
  onChangeAnchorDate,
  onOpenCalendar,
  calendar,
  onRecord,
}: {
  period: PeriodType
  anchorDate: Date
  onChangePeriod: (period: PeriodType) => void
  onChangeAnchorDate: (date: Date) => void
  onOpenCalendar?: () => void
  calendar?: ReactNode
  onRecord: () => void
}) {
  const { t, i18n } = useTranslation("common")
  const s = useReportSurface()
  const { fontScale } = useWindowDimensions()
  const dateKey = toDateKey(anchorDate)
  const scrollRef = useRef<ScrollView>(null)
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false })
  }, [period, dateKey])
  // enabled 를 쓰지 않으므로 isPending 이 아니라 isLoading 을 본다(훅 주석 참고).
  const { data, isLoading, isError, error, refetch, isRefetching } =
    useStatsReport(period, dateKey)

  /*
    ── 요구·완료·대기·실패 (설계 §J2) ──────────────────────────────────────────
    요구는 React Query 의 `queryFn` 이 **아니라** 여기서 센다. staleTime 이 5분이라
    ‹ › 로 오간 기간은 대부분 캐시 히트이고, 그러면 queryFn 이 아예 안 돌아 분모가
    조용히 반토막 난다 — 그 상태의 완주율은 100% 를 넘는다.
  */
  const requestedRef = useRef<{ period: PeriodType; dateKey: string } | null>(
    null,
  )
  useEffect(() => {
    const previous = requestedRef.current
    if (previous?.period === period && previous.dateKey === dateKey) return
    requestedRef.current = { period, dateKey }
    trackAnalyticsEvent("stats_report_requested", {
      period,
      entry:
        previous === null
          ? "enter"
          : previous.period === period
            ? "shift"
            : "period",
    })
  }, [period, dateKey])

  // 완료는 **한 벌당 1회**. 리포트가 도착한 뒤에도 이 화면은 스크롤·테마로 리렌더된다.
  const viewedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!data) return
    const key = `${period}:${dateKey}`
    if (viewedRef.current === key) return
    viewedRef.current = key
    trackAnalyticsEvent("stats_report_viewed", {
      period,
      reliability: data.reliability.level,
    })
  }, [data, period, dateKey])

  /*
    실패는 **여정 이름**으로 센다. 공용 통로 둘 다 여기 닿지 않기 때문이다 —
    `error_state_viewed` 는 `V2ErrorState` 한 곳에서만 나가는 것이 계약인데 이 화면은
    자기 카드(`ErrorCard`)를 그리고, `presentError` 도 안 부르므로
    `app_error_presented` 에도 한 행이 없다. 여기서 안 세면 어디에서도 안 세어진다.
  */
  const errorShownRef = useRef<string | null>(null)
  const resolved = isError ? resolveError(error) : null
  useEffect(() => {
    const key = `${period}:${dateKey}`
    if (!isError) {
      // 재시도로 풀린 기간은 다시 실패하면 다시 센다(같은 기간의 두 번째 실패는 새 사건이다).
      if (errorShownRef.current === key) errorShownRef.current = null
      return
    }
    if (errorShownRef.current === key) return
    errorShownRef.current = key
    trackAnalyticsEvent("stats_report_failed", {
      period,
      // 이 화면에서 가장 흔한 실패는 장애가 아니라 **기록이 없는 기간**(404)이다.
      fail_kind: toAnalyticsFailKind(error),
    })
  }, [isError, error, period, dateKey])

  /*
    대기도 공용 통로다. `useLoadingVisible` 을 태우면 `wait_perceived` 가 따라오고,
    덤으로 캐시 히트에서 스켈레톤이 한 프레임 번쩍이던 것도 사라진다.
  */
  const showSkeleton = useLoadingVisible(isLoading, {
    surface: "statistics_report",
  })

  const today = startOfDay(new Date())
  // 미래 기간으로는 못 간다 — 다음 기간의 시작일이 오늘을 넘으면 비활성.
  const nextDisabled =
    periodStart(period, shiftAnchor(period, anchorDate, 1)) > today

  return (
    <View style={styles.root}>
      <View key={fontScale} style={styles.controls}>
        <PeriodSegment period={period} onChange={onChangePeriod} s={s} />
        <View style={styles.navRow}>
          <NavButton
            icon="chevron-back"
            label={t("stats.previousPeriod")}
            onPress={() =>
              onChangeAnchorDate(shiftAnchor(period, anchorDate, -1))
            }
            s={s}
          />
          <Pressable
            onPress={onOpenCalendar}
            disabled={!onOpenCalendar}
            accessibilityRole="button"
            accessibilityLabel={t("stats.openCalendar")}
            style={styles.datePickerTrigger}
          >
            <Text
              style={[styles.navTitle, styles.tabular, { color: s.textStrong }]}
            >
              {fallbackTitle(
                period,
                anchorDate,
                i18n.resolvedLanguage ?? i18n.language,
              )}
            </Text>
            {onOpenCalendar ? (
              <Ionicons name="chevron-down" size={16} color={s.text} />
            ) : null}
          </Pressable>
          <NavButton
            icon="chevron-forward"
            label={t("stats.nextPeriod")}
            onPress={() =>
              onChangeAnchorDate(shiftAnchor(period, anchorDate, 1))
            }
            disabled={nextDisabled}
            s={s}
          />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={[
          styles.scroll,
          { backgroundColor: s.isDark ? s.canvas : s.band },
        ]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={s.textMuted}
          />
        }
      >
        {calendar ? (
          <View
            style={{
              marginHorizontal: -LAYOUT.screenX,
              marginTop: -12,
              paddingTop: 4,
              marginBottom: 16,
              backgroundColor: s.canvas,
            }}
          >
            {calendar}
          </View>
        ) : null}
        {/* 로딩 중에는 스켈레톤이거나 **아무것도 아니다**(문턱 아래의 빠른 응답).
            여기서 오류 가지로 떨어지면 캐시 히트마다 오류 카드가 한 프레임 번쩍인다. */}
        {isLoading ? (
          showSkeleton ? (
            <LoadingSkeleton />
          ) : null
        ) : isError || !data ? (
          <ErrorCard
            resolved={resolved ?? resolveError(error)}
            onRetry={() => refetch()}
            s={s}
          />
        ) : (
          <ReportContent
            key={`${period}:${dateKey}`}
            report={data}
            onRecord={onRecord}
            onSelectDay={(date) => {
              onChangeAnchorDate(date)
              onChangePeriod("day")
            }}
          />
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ["tabular-nums"] },
  root: { flex: 1 },
  controls: {
    paddingHorizontal: LAYOUT.screenX,
    paddingTop: 4,
    paddingBottom: 4,
    gap: 4,
  },
  navRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  datePickerTrigger: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  navTitle: {
    flexShrink: 1,
    textAlign: "center",
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.34,
    fontWeight: "700",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenX,
    paddingBottom: 48,
    paddingTop: 12,
  },
})
