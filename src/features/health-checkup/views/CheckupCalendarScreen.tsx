import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * 월별 캘린더 — 검사 기록 탭의 "월별보기".
 *
 * 시안: `Date.png`.
 *
 * ## 7열이다 (시안은 6열로 보이지만)
 * 시안에는 월~토 6열만 그려져 있다. 그대로 만들면 달력이 성립하지 않는다 — 2026년 7월은
 * 5일이 일요일이라 **7월 5일이 화면에서 사라진다**. 6열 격자는 주가 6일이라는 뜻이고 그런
 * 달력은 없다. 시안 프레임이 오른쪽에서 잘린 것으로 보고 **월~일 7열**로 그린다.
 *
 * ## 월 이동은 로컬 상태다
 * 달을 넘길 때 서버를 다시 부르지 않는다. `analysis.calendar` 는 선택한 회차 전체의 날짜를
 * 이미 담고 있으므로, 화면은 그중 이 달에 해당하는 날만 골라 쓰면 된다. 검진이 하나도 없는
 * 달로 가도 격자는 정상적으로 그려져야 한다(빈 달이 오류처럼 보이면 안 된다).
 *
 * ## 시작 달
 * 오늘이 아니라 **가장 최근 검진이 있는 달**에서 시작한다. 오늘 달에서 시작하면 과거에
 * 검진한 사용자는 빈 달을 보고 몇 번을 뒤로 넘겨야 데이터를 만난다.
 */

import { useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"

import {
  GUTTER,
  V2Badge,
  V2Divider,
  V2IconButton,
  V2ScreenHeader,
  radius,
  spacing,
  typography,
  useLoadingVisible,
  useV2Theme,
} from "@/src/design-system-v2"
import type { CalendarDay } from "@/src/types/healthAnalysis"

import { checkupAnalysisQuery } from "../data/checkupQueries"
import { CheckupDetailTrendBanner } from "../components/CheckupDetailTrendBanner"
import {
  CheckupDetailAnalyzingState,
  CheckupDetailErrorState,
  CheckupDetailNoSelectionState,
} from "../components/CheckupDetailAnalysisStates"
import { parseCheckupYmd, toIsoDateKey } from "../components/CheckupDetailDates"

/** 월요일 시작. i18n 키 순서가 곧 열 순서다. */
const WEEKDAY_KEYS = [
  "weekdayMon",
  "weekdayTue",
  "weekdayWed",
  "weekdayThu",
  "weekdayFri",
  "weekdaySat",
  "weekdaySun",
] as const

interface YearMonth {
  year: number
  /** 1~12 */
  month: number
}

interface CalendarCell {
  key: string
  day: number
  inMonth: boolean
}

export interface CheckupCalendarScreenProps {
  /** 분석할 검진 회차 id. 비어 있으면 빈 상태를 그린다. */
  resultIds: number[]
  /** 뒤로 = 검사 기록 탭으로 복귀. 헤더 좌측 chevron 과 우측 "주별보기" 가 같은 곳으로 간다. */
  onBack: () => void
}

export function CheckupCalendarScreen({
  resultIds,
  onBack,
}: CheckupCalendarScreenProps) {
  const { t } = useTranslation("health")
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()

  const [cursor, setCursor] = useState<YearMonth | null>(null)

  const query = useQuery(checkupAnalysisQuery(resultIds))
  const analysis = query.data
  const showSkeleton = useLoadingVisible(
    query.isLoading && resultIds.length > 0,
    { surface: "checkup_calendar" },
  )

  /**
   * 날짜 키를 로컬 좌표계로 다시 만들어 담는다. 서버가 ISO 로 주더라도 화면이 만드는 키와
   * 같은 함수를 거치게 해서 표기가 어긋날 여지를 없앤다.
   */
  const daysByKey = useMemo(() => {
    const map = new Map<string, CalendarDay>()
    for (const day of analysis?.calendar ?? []) {
      const ymd = parseCheckupYmd(day.date)
      if (ymd) map.set(toIsoDateKey(ymd.year, ymd.month, ymd.day), day)
    }
    return map
  }, [analysis])

  const latestMonth = useMemo<YearMonth | null>(() => {
    const dates = analysis?.calendar ?? []
    let latest: YearMonth | null = null
    let latestKey = ""
    for (const day of dates) {
      const ymd = parseCheckupYmd(day.date)
      if (!ymd) continue
      const key = toIsoDateKey(ymd.year, ymd.month, ymd.day)
      if (key > latestKey) {
        latestKey = key
        latest = { year: ymd.year, month: ymd.month }
      }
    }
    return latest
  }, [analysis])

  // 렌더마다 `new Date()` 를 만들면 아래 useMemo 들의 의존성이 매번 바뀌어 격자를 다시 만든다.
  const today = useMemo(() => {
    const at = new Date()
    return {
      year: at.getFullYear(),
      month: at.getMonth() + 1,
      day: at.getDate(),
    }
  }, [])
  const todayKey = toIsoDateKey(today.year, today.month, today.day)

  const active = useMemo<YearMonth>(
    () => cursor ?? latestMonth ?? { year: today.year, month: today.month },
    [cursor, latestMonth, today],
  )

  /**
   * 격자. `new Date(year, monthIndex, day)` 는 범위를 넘는 day 를 알아서 이웃 달로 넘겨 주므로
   * 앞뒤로 삐져나오는 칸도 같은 식 하나로 만들어진다.
   */
  const weeks = useMemo<CalendarCell[][]>(() => {
    const first = new Date(active.year, active.month - 1, 1)
    // getDay(): 0=일 … 6=토. 월요일 시작 격자로 옮긴다.
    const leading = (first.getDay() + 6) % 7
    // month 인자에 다음 달, day 에 0 을 주면 이번 달 마지막 날이 나온다.
    const daysInMonth = new Date(active.year, active.month, 0).getDate()
    const rows = Math.ceil((leading + daysInMonth) / 7)

    return Array.from({ length: rows }, (_, row) =>
      Array.from({ length: 7 }, (_, col) => {
        const date = new Date(
          active.year,
          active.month - 1,
          1 - leading + row * 7 + col,
        )
        return {
          key: toIsoDateKey(
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate(),
          ),
          day: date.getDate(),
          inMonth: date.getMonth() === active.month - 1,
        }
      }),
    )
  }, [active])

  const shiftMonth = (delta: number) => {
    const next = new Date(active.year, active.month - 1 + delta, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() + 1 })
  }

  const body = () => {
    if (resultIds.length === 0) return <CheckupDetailNoSelectionState />
    if (showSkeleton) return <CheckupDetailAnalyzingState />
    if (query.isError)
      return (
        <CheckupDetailErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      )
    /*
     * `useLoadingVisible` 이 스켈레톤을 억제하는 첫 180ms 동안 `analysis` 는 아직 undefined 다.
     * 그때 그냥 진행하면 `daysByKey` 가 비고 `active` 가 **오늘 달**로 떨어져 빈 달력을 그렸다가,
     * 응답이 오면 검진이 있는 달로 훌쩍 점프한다. 아무것도 안 그리는 편이 낫다.
     * (상세 화면은 `if (!analysis) return null` 로 이미 같은 처리를 한다.)
     */
    if (!analysis) return null

    return (
      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing[32] }}
      >
        {analysis?.trendInsight != null && (
          <CheckupDetailTrendBanner segments={analysis.trendInsight.segments} />
        )}

        <View style={styles.monthHeader}>
          <Text
            style={[typography.title.small, { color: colors.label.normal }]}
          >
            {t("checkup.calendar.yearMonth", {
              year: active.year,
              month: active.month,
            })}
          </Text>
          <View style={styles.monthNav}>
            <V2IconButton
              name="chevronLeft"
              size="s"
              variant="clear"
              accessibilityLabel={t("checkup.calendar.prevMonth")}
              onPress={() => shiftMonth(-1)}
            />
            <V2IconButton
              name="chevronRight"
              size="s"
              variant="clear"
              accessibilityLabel={t("checkup.calendar.nextMonth")}
              onPress={() => shiftMonth(1)}
            />
          </View>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAY_KEYS.map((key) => (
            <Text
              key={key}
              style={[
                typography.subtext.medium,
                styles.weekdayLabel,
                { color: colors.label.alternative },
              ]}
            >
              {t(`checkup.calendar.${key}`)}
            </Text>
          ))}
        </View>

        {weeks.map((week, index) => (
          <View key={week[0]?.key ?? index}>
            {index > 0 && <V2Divider tone="alternative" />}
            <View style={styles.weekRow}>
              {week.map((cell) => (
                <CalendarCellView
                  key={cell.key}
                  cell={cell}
                  day={daysByKey.get(cell.key)}
                  isToday={cell.key === todayKey}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background.default }]}>
      <V2ScreenHeader
        onBack={onBack}
        right={
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            hitSlop={spacing[8]}
            style={({ pressed }) => [
              styles.headerAction,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                typography.label.small,
                { color: colors.label.alternative },
              ]}
            >
              {t("checkup.records.weeklyView")}
            </Text>
          </Pressable>
        }
      />
      {body()}
    </View>
  )
}

/**
 * 날짜 한 칸.
 *
 * pill 은 **이번 달 칸에만** 그린다. 앞뒤로 삐져나온 칸은 "이 달이 아니다" 를 뜻하려고
 * 일부러 흐리게 칠하는데, 거기에 색 있는 pill 을 얹으면 흐리게 만든 이유가 사라진다.
 * 정상(normal)은 pill 로 그리지 않는다 — 대부분의 수치가 정상이라 달력이 초록으로 덮인다.
 */
function CalendarCellView({
  cell,
  day,
  isToday,
}: {
  cell: CalendarCell
  day: CalendarDay | undefined
  isToday: boolean
}) {
  const { t } = useTranslation("health")
  const { colors } = useV2Theme()

  const caution = cell.inMonth ? (day?.caution ?? 0) : 0
  const warning = cell.inMonth ? (day?.warning ?? 0) : 0

  return (
    <View style={styles.cell}>
      <View
        style={[
          styles.dayBox,
          isToday && {
            backgroundColor: colors.fill.normal,
            borderRadius: radius.sm,
          },
        ]}
      >
        <Text
          style={[
            typography.label.small,
            {
              color: cell.inMonth
                ? colors.label.normal
                : colors.label.assistive,
            },
          ]}
        >
          {cell.day}
        </Text>
      </View>

      {/* V2Badge 는 스스로 alignSelf:flex-start 라 부모의 alignItems 로는 못 가운데 놓는다. */}
      <View style={styles.pills}>
        {caution > 0 && (
          <V2Badge size="xs" color="yellow" variant="weak" style={styles.pill}>
            {`${t("checkup.status.caution")} ${caution}`}
          </V2Badge>
        )}
        {warning > 0 && (
          <V2Badge size="xs" color="red" variant="weak" style={styles.pill}>
            {`${t("checkup.status.warning")} ${warning}`}
          </V2Badge>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerAction: { paddingHorizontal: spacing[8], paddingVertical: spacing[4] },
  pressed: { opacity: 0.6 },

  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUTTER,
    paddingTop: spacing[24],
    paddingBottom: spacing[16],
  },
  monthNav: { flexDirection: "row", alignItems: "center", gap: spacing[8] },

  weekdayRow: {
    flexDirection: "row",
    paddingHorizontal: GUTTER,
    paddingBottom: spacing[12],
  },
  weekdayLabel: { flex: 1, textAlign: "center" },

  weekRow: {
    flexDirection: "row",
    paddingHorizontal: GUTTER,
    paddingVertical: spacing[12],
  },
  cell: { flex: 1, alignItems: "center", gap: spacing[6], minHeight: 72 },
  dayBox: {
    minWidth: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[6],
  },
  pills: { alignItems: "center", gap: spacing[4] },
  pill: { alignSelf: "center" },
})
