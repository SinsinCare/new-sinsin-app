import React, { useMemo } from "react"
import { StyleSheet, View, ScrollView, Dimensions } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppRouter } from "@/src/shared/navigation"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ThemedText } from "@/components/themed-text"
import { useLoadingVisible } from "@/src/design-system-v2"
import { HealthDashboardSkeleton } from "../components/HealthSkeletons"
import { ThemedView } from "@/components/themed-view"
import { tokens } from "@/src/theme/tokens"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { Button } from "@/src/shared/components/Button"
import { TrendChart } from "../components/TrendChart"
import { healthDashboardQueryOptions } from "../data/healthQueries"
import { useHealthTheme } from "../hooks/useHealthTheme"
import {
  DASHBOARD_MODULES,
  STATUS_COLORS,
  buildSeries,
  formatHealthDate,
  normalRangeText,
  worstStatus,
} from "../data/dashboardMetrics"
import type {
  MetricSeries,
  MetricStatus,
  ModuleConfig,
} from "../data/dashboardMetrics"

const CONTENT_PADDING = 20
const CARD_PADDING = 16
const CHART_WIDTH =
  Dimensions.get("window").width - CONTENT_PADDING * 2 - CARD_PADDING * 2
const STATUS_LABEL_KEYS = {
  normal: "dashboard.status.withinRange",
  caution: "dashboard.status.outsideRange",
  warning: "dashboard.status.review",
} as const

interface ModuleData {
  config: ModuleConfig
  series: MetricSeries[]
  status: MetricStatus | null
}

/** 모듈별 참고 범위 비교 카드 + 최신 수치 칩 */
function ModuleStatusCard({ data }: { data: ModuleData }) {
  const { config, series, status } = data
  const statusStyle = status ? STATUS_COLORS[status] : null
  const { t } = useTranslation("health")
  const { healthColors } = useHealthTheme()

  return (
    <View
      style={[
        cardStyles.statusCard,
        {
          borderColor: healthColors.line,
          backgroundColor: healthColors.surface,
        },
      ]}
    >
      <View style={cardStyles.statusHeader}>
        <View
          style={[
            cardStyles.statusIcon,
            { backgroundColor: `${config.accent}14` },
          ]}
        >
          <Ionicons
            name={config.icon as keyof typeof Ionicons.glyphMap}
            size={18}
            color={config.accent}
          />
        </View>
        <ThemedText
          style={[cardStyles.statusTitle, { color: healthColors.text }]}
        >
          {t(`dashboard.modules.${config.translationKey}.title`)}
        </ThemedText>
        {statusStyle ? (
          <View
            style={[
              cardStyles.statusBadge,
              { backgroundColor: statusStyle.bg },
            ]}
          >
            <View
              style={[
                cardStyles.statusDot,
                { backgroundColor: statusStyle.dot },
              ]}
            />
            <ThemedText
              style={[cardStyles.statusBadgeText, { color: statusStyle.text }]}
            >
              {status ? t(STATUS_LABEL_KEYS[status]) : null}
            </ThemedText>
          </View>
        ) : (
          <View
            style={[
              cardStyles.statusBadge,
              cardStyles.statusBadgeEmpty,
              { backgroundColor: healthColors.surfaceMuted },
            ]}
          >
            <ThemedText
              style={[
                cardStyles.statusBadgeEmptyText,
                { color: healthColors.textAssistive },
              ]}
            >
              {t("dashboard.noRecords")}
            </ThemedText>
          </View>
        )}
      </View>

      {status ? (
        <View style={cardStyles.chipRow}>
          {series
            .filter((s) => s.latest)
            .map((s) => (
              <View
                key={s.config.key}
                style={[
                  cardStyles.chip,
                  { backgroundColor: healthColors.surfaceMuted },
                ]}
              >
                <View
                  style={[
                    cardStyles.chipDot,
                    { backgroundColor: STATUS_COLORS[s.latest!.status].dot },
                  ]}
                />
                <ThemedText
                  style={[
                    cardStyles.chipLabel,
                    { color: healthColors.textSecondary },
                  ]}
                >
                  {t(`dashboard.metrics.${s.config.labelKey}`).replace(
                    /\s*\(.*\)\s*/,
                    "",
                  )}
                </ThemedText>
                <ThemedText
                  style={[cardStyles.chipValue, { color: healthColors.text }]}
                >
                  {s.latest!.value}
                  <ThemedText
                    style={[
                      cardStyles.chipUnit,
                      { color: healthColors.textAssistive },
                    ]}
                  >
                    {" "}
                    {s.config.unit}
                  </ThemedText>
                </ThemedText>
              </View>
            ))}
        </View>
      ) : (
        <ThemedText
          style={[
            cardStyles.placeholderText,
            { color: healthColors.textAssistive },
          ]}
        >
          {t(`dashboard.modules.${config.translationKey}.description`)}
        </ThemedText>
      )}
    </View>
  )
}

/** 개별 지표 추세 차트 카드 */
function MetricChartCard({ series }: { series: MetricSeries }) {
  const latest = series.latest
  const statusStyle = latest ? STATUS_COLORS[latest.status] : null
  const { t } = useTranslation("health")
  const { healthColors } = useHealthTheme()
  return (
    <View
      style={[
        cardStyles.chartCard,
        {
          borderColor: healthColors.line,
          backgroundColor: healthColors.surface,
        },
      ]}
    >
      <View style={cardStyles.chartHeader}>
        <View style={cardStyles.chartTitleWrap}>
          <ThemedText
            style={[cardStyles.chartTitle, { color: healthColors.text }]}
          >
            {t(`dashboard.metrics.${series.config.labelKey}`)}
          </ThemedText>
          <ThemedText
            style={[
              cardStyles.chartRange,
              { color: healthColors.textAssistive },
            ]}
          >
            {normalRangeText(series.config, t)} {series.config.unit}
          </ThemedText>
        </View>
        {latest && statusStyle && (
          <View style={cardStyles.chartLatest}>
            <ThemedText
              style={[cardStyles.chartLatestValue, { color: statusStyle.dot }]}
            >
              {latest.value}
            </ThemedText>
            <ThemedText
              style={[
                cardStyles.chartLatestUnit,
                { color: healthColors.textAssistive },
              ]}
            >
              {series.config.unit}
            </ThemedText>
          </View>
        )}
      </View>
      <TrendChart series={series} width={CHART_WIDTH} />
    </View>
  )
}

export function HealthDashboardScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const { t, i18n } = useTranslation("health")
  const language = i18n.resolvedLanguage ?? i18n.language
  const { healthColors } = useHealthTheme()
  const {
    data: details = [],
    isLoading: loading,
    isError,
    isFetching,
    refetch,
  } = useQuery(healthDashboardQueryOptions())
  const error = isError ? t("result.loadError") : null
  // 캐시 히트로 즉시 오는 경우엔 스켈레톤을 아예 그리지 않는다 (깜빡임 방지).
  const showSkeleton = useLoadingVisible(loading)

  const modules = useMemo<ModuleData[]>(() => {
    return DASHBOARD_MODULES.map((config) => {
      const series = config.metrics.map((m) =>
        buildSeries(m, details, language),
      )
      const withData = series.filter((s) => s.points.length > 0)
      const status = worstStatus(withData.map((s) => s.latest!.status))
      return { config, series, status }
    })
  }, [details, language])

  const dateRange = useMemo(() => {
    if (details.length === 0) return null
    const first = details[0].checkupDate
    const last = details[details.length - 1].checkupDate
    const firstLabel = formatHealthDate(first, language)
    const lastLabel = formatHealthDate(last, language)
    return first === last ? firstLabel : `${firstLabel} – ${lastLabel}`
  }, [details, language])

  const chartModules = modules.filter((m) => m.status != null)

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: healthColors.background }]}
    >
      <ScreenHeader
        title={t("dashboard.title")}
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      {showSkeleton && <HealthDashboardSkeleton />}

      {error && !loading && (
        <View style={styles.center}>
          <ThemedText
            style={[styles.errorText, { color: healthColors.textSecondary }]}
          >
            {error}
          </ThemedText>
          <View style={styles.stateAction}>
            <Button
              buttonSize="small"
              fullWidth
              loading={isFetching}
              onPress={() => void refetch()}
            >
              {t("actions.retryLoad")}
            </Button>
          </View>
        </View>
      )}

      {!loading && !error && details.length === 0 && (
        <View style={styles.center}>
          <Ionicons
            name="bar-chart-outline"
            size={48}
            color={healthColors.textAssistive}
          />
          <ThemedText style={[styles.emptyText, { color: healthColors.text }]}>
            {t("dashboard.emptyTitle")}
          </ThemedText>
          <ThemedText
            style={[styles.emptySub, { color: healthColors.textSecondary }]}
          >
            {t("dashboard.emptyDescription")}
          </ThemedText>
          <View style={styles.stateAction}>
            <Button
              buttonSize="small"
              fullWidth
              onPress={() => router.push("/(settings)/health-data")}
            >
              {t("actions.importResults")}
            </Button>
          </View>
        </View>
      )}

      {!loading && !error && details.length > 0 && (
        <ScrollView
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* 요약 */}
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: healthColors.positiveWeak,
                borderColor: healthColors.positive,
              },
            ]}
          >
            <View
              style={[
                styles.summaryIcon,
                { backgroundColor: healthColors.surface },
              ]}
            >
              <Ionicons
                name="documents-outline"
                size={20}
                color={tokens.color.sub6.val}
              />
            </View>
            <View style={styles.summaryInfo}>
              <ThemedText
                style={[styles.summaryCount, { color: healthColors.text }]}
              >
                {t("dashboard.recordCount", { count: details.length })}
              </ThemedText>
              {dateRange && (
                <ThemedText
                  style={[
                    styles.summaryRange,
                    { color: healthColors.textSecondary },
                  ]}
                >
                  {dateRange}
                </ThemedText>
              )}
            </View>
          </View>
          <ThemedText
            style={[
              styles.referenceNote,
              { color: healthColors.textSecondary },
            ]}
          >
            {t("dashboard.referenceNote")}
          </ThemedText>

          {/* 모듈별 상태 카드 */}
          <ThemedText
            style={[styles.sectionTitle, { color: healthColors.text }]}
          >
            {t("dashboard.statusSection")}
          </ThemedText>
          <View style={styles.moduleGrid}>
            {modules.map((m) => (
              <ModuleStatusCard key={m.config.id} data={m} />
            ))}
          </View>

          {/* 항목별 추세 그래프 */}
          <ThemedText
            style={[styles.sectionTitle, { color: healthColors.text }]}
          >
            {t("dashboard.trendSection")}
          </ThemedText>
          {chartModules.length === 0 ? (
            <ThemedText
              style={[
                styles.placeholderText,
                { color: healthColors.textAssistive },
              ]}
            >
              {t("dashboard.noTrend")}
            </ThemedText>
          ) : (
            chartModules.map((m) => (
              <View key={m.config.id} style={styles.chartGroup}>
                <View style={styles.chartGroupHeader}>
                  <Ionicons
                    name={m.config.icon as keyof typeof Ionicons.glyphMap}
                    size={15}
                    color={m.config.accent}
                  />
                  <ThemedText
                    style={[
                      styles.chartGroupTitle,
                      { color: healthColors.textSecondary },
                    ]}
                  >
                    {t(`dashboard.modules.${m.config.translationKey}.title`)}
                  </ThemedText>
                </View>
                {m.series
                  .filter((s) => s.points.length > 0)
                  .map((s) => (
                    <MetricChartCard key={s.config.key} series={s} />
                  ))}
              </View>
            ))
          )}

          <View
            style={[
              styles.legendRow,
              { borderTopColor: healthColors.lineSubtle },
            ]}
          >
            {(["normal", "caution", "warning"] as MetricStatus[]).map((st) => (
              <View key={st} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: STATUS_COLORS[st].dot },
                  ]}
                />
                <ThemedText
                  style={[
                    styles.legendText,
                    { color: healthColors.textSecondary },
                  ]}
                >
                  {t(STATUS_LABEL_KEYS[st])}
                </ThemedText>
              </View>
            ))}
            <View style={styles.legendItem}>
              <View style={styles.legendBand} />
              <ThemedText
                style={[
                  styles.legendText,
                  { color: healthColors.textSecondary },
                ]}
              >
                {t("dashboard.referenceRange")}
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      )}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
    marginTop: 4,
  },
  emptySub: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
  },
  stateAction: {
    width: 200,
    marginTop: 8,
  },
  scrollContent: {
    paddingHorizontal: CONTENT_PADDING,
    paddingTop: 16,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F0FDF9",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginBottom: 24,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryInfo: {
    flex: 1,
    gap: 2,
  },
  summaryCount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#17191C",
  },
  summaryRange: {
    fontSize: 13,
    color: "#64748B",
  },
  referenceNote: {
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: -12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#17191C",
    marginBottom: 12,
  },
  moduleGrid: {
    gap: 10,
    marginBottom: 24,
  },
  chartGroup: {
    marginBottom: 12,
  },
  chartGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    marginTop: 4,
  },
  chartGroupTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  placeholderText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#94A3B8",
    marginBottom: 16,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 14,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F2F5",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendBand: {
    width: 16,
    height: 10,
    borderRadius: 2,
    backgroundColor: "#FE713926",
  },
  legendText: {
    fontSize: 12,
    color: "#64748B",
  },
})

const cardStyles = StyleSheet.create({
  statusCard: {
    borderWidth: 1,
    borderColor: "#F0F2F5",
    borderRadius: 14,
    padding: CARD_PADDING,
    gap: 12,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#17191C",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeEmpty: {
    backgroundColor: "#F1F5F9",
  },
  statusBadgeEmptyText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  chipValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#17191C",
  },
  chipUnit: {
    fontSize: 11,
    fontWeight: "400",
    color: "#94A3B8",
  },
  placeholderText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#94A3B8",
  },
  chartCard: {
    borderWidth: 1,
    borderColor: "#F0F2F5",
    borderRadius: 14,
    padding: CARD_PADDING,
    marginBottom: 10,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  chartTitleWrap: {
    flex: 1,
    gap: 2,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#17191C",
  },
  chartRange: {
    fontSize: 12,
    color: "#94A3B8",
  },
  chartLatest: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  chartLatestValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  chartLatestUnit: {
    fontSize: 11,
    color: "#94A3B8",
  },
})
