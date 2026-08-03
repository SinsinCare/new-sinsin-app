import Ionicons from "@expo/vector-icons/Ionicons"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated"
import { useTranslation } from "react-i18next"

import { V2Skeleton, V2SkeletonGroup } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { resolveError, type ResolvedError } from "@/src/lib/errorMessage"
import { REPORT_GAP } from "@/src/shared/components/ReportSection"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import type { SurfacePalette } from "@/src/theme/surface"
import { LAYOUT, TYPE } from "@/src/theme/surface"

import { useStatsReport } from "../hooks/useStatsReport"
import type { PeriodType, StatsReliability, StatsReport } from "../types/report"
import { ConclusionCard } from "./ConclusionCard"
import { DisclaimerFooter } from "./DisclaimerFooter"
import { FoodList } from "./FoodList"
import { MaintainCard } from "./MaintainCard"
import { MetricList } from "./MetricList"
import { NutrientRemainList } from "./NutrientRemainList"
import { OverlapCard } from "./OverlapCard"
import { WeekBarChart } from "./WeekBarChart"
import { WeeklyCompareCard } from "./WeeklyCompareCard"
import { WeightTrendCard } from "./WeightTrendCard"

type Surface = SurfacePalette & { isDark: boolean }

/* ─── 날짜 계산 ───────────────────────────────────────────────────
 * 기간의 정의(월요일 시작 주, 달력 월)는 서버와 같은 규칙이어야 한다 —
 * 여기서 어긋나면 ‹ › 로 이동한 기간과 서버가 계산한 기간이 달라진다. */

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** 그 날이 속한 주의 월요일(계약: 주간은 월요일 시작 7일) */
function mondayOf(date: Date): Date {
  const day = startOfDay(date)
  const offset = (day.getDay() + 6) % 7 // 월=0 … 일=6
  return addDays(day, -offset)
}

/** 서버 date 파라미터 포맷(YYYY-MM-DD, 로컬). toISOString 은 UTC 라 하루가 밀린다. */
function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** 기간의 시작일 — 미래 이동 차단 판정에 쓴다 */
function periodStart(period: PeriodType, date: Date): Date {
  if (period === "day") return startOfDay(date)
  if (period === "week") return mondayOf(date)
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/** ‹ › 한 칸 이동. 월은 1일로 스냅해 31일→2월 같은 오버플로를 피한다. */
function shiftAnchor(period: PeriodType, date: Date, dir: -1 | 1): Date {
  if (period === "day") return addDays(startOfDay(date), dir)
  if (period === "week") return addDays(startOfDay(date), dir * 7)
  return new Date(date.getFullYear(), date.getMonth() + dir, 1)
}

/**
 * 서버 title 이 오기 전(로딩)의 대체 타이틀. 포맷은 계약과 같은 규칙 —
 * day "7월 24일 금" / week "7월 18일 – 24일" / month "7월"(타년도면 "2025년 12월").
 */
function fallbackTitle(
  period: PeriodType,
  date: Date,
  language: string,
): string {
  const locale = language.startsWith("en") ? "en-US" : "ko-KR"
  if (period === "day") {
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(date)
  }
  if (period === "week") {
    const start = mondayOf(date)
    const end = addDays(start, 6)
    const formatter = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    })
    const startLabel = formatter.format(start)
    const endLabel = formatter.format(end)
    return `${startLabel} – ${endLabel}`
  }
  return new Intl.DateTimeFormat(locale, {
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    month: "long",
  }).format(date)
}

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
}: {
  period: PeriodType
  anchorDate: Date
  onChangePeriod: (period: PeriodType) => void
  onChangeAnchorDate: (date: Date) => void
}) {
  const { t, i18n } = useTranslation("common")
  const s = useSurface()
  const dateKey = toDateKey(anchorDate)
  // enabled 를 쓰지 않으므로 isPending 이 아니라 isLoading 을 본다(훅 주석 참고).
  const { data, isLoading, isError, error, refetch } = useStatsReport(
    period,
    dateKey,
  )

  const today = startOfDay(new Date())
  // 미래 기간으로는 못 간다 — 다음 기간의 시작일이 오늘을 넘으면 비활성.
  const nextDisabled =
    periodStart(period, shiftAnchor(period, anchorDate, 1)) > today

  return (
    <View style={styles.root}>
      <View style={styles.controls}>
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
          <Text
            style={[styles.navTitle, styles.tabular, { color: s.textStrong }]}
          >
            {(i18n.resolvedLanguage ?? i18n.language).startsWith("en")
              ? fallbackTitle(
                  period,
                  anchorDate,
                  i18n.resolvedLanguage ?? i18n.language,
                )
              : (data?.title ??
                fallbackTitle(
                  period,
                  anchorDate,
                  i18n.resolvedLanguage ?? i18n.language,
                ))}
          </Text>
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
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <LoadingSkeleton />
        ) : isError || !data ? (
          <ErrorCard
            resolved={resolveError(error)}
            onRetry={() => refetch()}
            s={s}
          />
        ) : (
          <ReportSections key={`${period}:${dateKey}`} report={data} s={s} />
        )}
      </ScrollView>
    </View>
  )
}

/** 섹션 조립 — 진입 애니메이션은 여기서 한 번만 준다(카드별로 주지 않는다). */
function ReportSections({ report, s }: { report: StatsReport; s: Surface }) {
  const { t } = useTranslation("common")
  const nutrients = report.nutrients ?? []
  const averages = report.averages ?? []
  const vitals = report.vitals ?? []
  const foods = report.foods ?? []

  return (
    <Animated.View
      entering={FadeInDown.duration(280).reduceMotion(ReduceMotion.System)}
      style={styles.sections}
    >
      {report.reliability.level === "LOW" && (
        <LowDataNotice reliability={report.reliability} s={s} />
      )}

      <ConclusionCard report={report} s={s} />

      {report.overlapSignals && (
        <OverlapCard data={report.overlapSignals} s={s} />
      )}

      {report.maintainCard && <MaintainCard data={report.maintainCard} s={s} />}

      {nutrients.length > 0 && (
        <NutrientRemainList
          rows={nutrients}
          footnote={report.nutrientsFootnote}
          s={s}
        />
      )}

      {report.weekCharts?.potassium && (
        <WeekBarChart
          title={t("nutrient.potassium")}
          chart={report.weekCharts.potassium}
          s={s}
        />
      )}

      {report.weekCharts?.weight && (
        <WeightTrendCard chart={report.weekCharts.weight} s={s} />
      )}

      {averages.length > 0 && (
        <MetricList title={t("stats.metrics")} rows={averages} s={s} />
      )}

      {report.weeklyCompare && (
        <WeeklyCompareCard data={report.weeklyCompare} s={s} />
      )}

      {vitals.length > 0 && (
        <MetricList title={t("stats.todaysNumbers")} rows={vitals} s={s} />
      )}

      {foods.length > 0 && <FoodList rows={foods} s={s} />}

      {!!report.disclaimer && (
        <DisclaimerFooter text={report.disclaimer} s={s} />
      )}
    </Animated.View>
  )
}

/* ─── 세그먼트(일/주/월) ──────────────────────────────────────── */

const PERIODS: PeriodType[] = ["day", "week", "month"]

/**
 * 트랙은 surface, 선택 아이템만 흰 면 + textStrong.
 * 브랜드색은 선택 아이템의 2px 밑줄 인디케이터에만 쓴다 —
 * 세그먼트가 CTA 처럼 보이면 안 되기 때문이다.
 */
function PeriodSegment({
  period,
  onChange,
  s,
}: {
  period: PeriodType
  onChange: (period: PeriodType) => void
  s: Surface
}) {
  const { t } = useTranslation("common")
  return (
    <View style={[styles.segmentTrack, { backgroundColor: s.surface }]}>
      {PERIODS.map((item) => {
        const selected = item === period
        const label = t(`stats.period.${item}`)
        return (
          <View key={item} style={styles.segmentSlot}>
            <SurfacePressable
              onPress={() => onChange(item)}
              // "transparent" 금지 — 워클릿 색 보간이 죽는다. 트랙색을 그대로 깐다.
              baseColor={selected ? s.card : s.surface}
              pressedColor={selected ? s.card : s.surfacePressed}
              style={styles.segmentItem}
              accessibilityLabel={t("stats.periodReport", { period: label })}
              accessibilityState={{ selected }}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  { color: selected ? s.textStrong : s.textMuted },
                ]}
              >
                {label}
              </Text>
              {selected && (
                <View
                  style={[
                    styles.segmentIndicator,
                    { backgroundColor: s.brand },
                  ]}
                />
              )}
            </SurfacePressable>
          </View>
        )
      })}
    </View>
  )
}

/* ─── 기간 ‹ › 내비 ──────────────────────────────────────────── */

/** MonthCalendarSheet 의 NavButton 문법 — 32 원형 surface 면 */
function NavButton({
  icon,
  label,
  onPress,
  disabled,
  s,
}: {
  icon: "chevron-back" | "chevron-forward"
  label: string
  onPress: () => void
  disabled?: boolean
  s: Surface
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={disabled ? { disabled } : undefined}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.navButton,
            { backgroundColor: pressed ? s.surfacePressed : s.surface },
          ]}
        >
          <Ionicons
            name={icon}
            size={16}
            color={disabled ? s.placeholder : s.text}
          />
        </View>
      )}
    </Pressable>
  )
}

/* ─── 상태 화면 조각 ─────────────────────────────────────────── */

/** 로딩 스켈레톤 — 결론·차트·리스트 자리의 회색 면 3장 */
function LoadingSkeleton() {
  return (
    // 면 자체는 예전과 같은 3장이지만 앱 공통 시머를 탄다 — 다른 화면과 같은 리듬으로 숨 쉰다.
    <V2SkeletonGroup style={styles.sections}>
      <V2Skeleton height={190} radius="2xl" />
      <V2Skeleton height={150} radius="2xl" />
      <V2Skeleton height={120} radius="2xl" />
    </V2SkeletonGroup>
  )
}

/**
 * 리포트를 못 받았을 때의 카드.
 *
 * 예전에는 원인과 무관하게 "인터넷 연결을 확인한 뒤 다시 불러와 주세요." 한 줄이었다.
 * 이 화면에서 실제로 자주 나는 실패는 연결이 아니라 **기록이 없는 기간**(404)과 점검
 * (5xx)이고, 404 는 몇 번을 다시 불러도 같은 답이 온다. `resolveError` 가 원인을 고르고,
 * `retryable` 이 false 면 다시 불러오기 버튼을 아예 그리지 않는다 — 눌러도 달라지지 않는
 * 버튼은 "해결할 수 있다" 는 거짓말이다.
 */
function ErrorCard({
  resolved,
  onRetry,
  s,
}: {
  resolved: ResolvedError
  onRetry: () => void
  s: Surface
}) {
  const { t } = useTranslation("common")
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: s.card, borderColor: s.hairline },
      ]}
    >
      <Text
        style={[styles.errorTitle, { color: s.textStrong }]}
        lineBreakStrategyIOS="hangul-word"
        textBreakStrategy="balanced"
      >
        {resolved.title}
      </Text>
      {resolved.body ? (
        <Text
          style={[styles.errorBody, { color: s.textMuted }]}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {resolved.body}
        </Text>
      ) : null}
      {resolved.retryable ? (
        <SurfacePressable
          onPress={onRetry}
          baseColor={s.surface}
          pressedColor={s.surfacePressed}
          style={styles.retryButton}
          accessibilityLabel={t("stats.retryAccessibility")}
        >
          <Text style={[styles.retryLabel, { color: s.textStrong }]}>
            {t("action.retry")}
          </Text>
        </SurfacePressable>
      ) : null}
    </View>
  )
}

/**
 * '기록 부족' 안내 — reliability.level 이 LOW 일 때 리스트 맨 위에.
 * 숫자(기록/기대 끼니)는 서버 값 그대로 조립만 한다.
 */
function LowDataNotice({
  reliability,
  s,
}: {
  reliability: StatsReliability
  s: Surface
}) {
  const { t } = useTranslation("common")
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: s.card, borderColor: s.hairline },
      ]}
    >
      <View style={styles.noticeHead}>
        <Text style={[styles.noticeTitle, { color: s.textStrong }]}>
          {t("stats.lowDataTitle")}
        </Text>
        <Text
          style={[styles.noticeMeta, styles.tabular, { color: s.textWeak }]}
        >
          {t("stats.mealsRecorded", {
            recorded: reliability.mealsRecorded,
            expected: reliability.mealsExpected,
            rate: reliability.ratePercent,
          })}
        </Text>
      </View>
      <Text
        style={[styles.noticeBody, { color: s.textMuted }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {t("stats.lowDataBody")}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ["tabular-nums"] },
  root: { flex: 1 },

  controls: {
    paddingHorizontal: LAYOUT.screenX,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 12,
  },

  segmentTrack: {
    flexDirection: "row",
    borderRadius: LAYOUT.segment.radius,
    padding: 3,
    gap: 3,
  },
  segmentSlot: { flex: 1 },
  segmentItem: {
    height: LAYOUT.segment.itemHeight,
    borderRadius: LAYOUT.segment.itemRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentLabel: { ...TYPE.value, fontWeight: "700" },
  segmentIndicator: {
    position: "absolute",
    bottom: 5,
    width: 14,
    height: 2,
    borderRadius: 1,
  },

  navRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  navTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.34,
    fontWeight: "700",
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenX,
    paddingBottom: 48,
  },
  // 섹션과 섹션 사이(24)는 카드 사이(8)보다 확실히 넓다 — 그 차이가
  // "여기서 화제가 바뀐다"를 말한다. 둘이 같으면 페이지가 한 덩어리로 읽힌다.
  sections: { gap: REPORT_GAP.section, paddingTop: 4 },

  card: {
    borderRadius: LAYOUT.card.radius,
    padding: LAYOUT.card.padding,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },

  errorTitle: { ...TYPE.cardTitle, fontSize: 16, fontWeight: "700" },
  errorBody: { ...TYPE.caption },
  retryButton: {
    height: LAYOUT.control.height,
    borderRadius: LAYOUT.control.radius,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  retryLabel: { ...TYPE.caption, fontWeight: "700" },

  noticeHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  noticeTitle: {
    ...TYPE.cardTitle,
    fontSize: 16,
    fontWeight: "700",
    flexShrink: 1,
  },
  noticeMeta: { ...TYPE.cardSub, flexShrink: 0 },
  noticeBody: { ...TYPE.caption },
})
