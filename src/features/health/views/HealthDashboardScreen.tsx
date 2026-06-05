import React, { useEffect, useMemo, useState } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { tokens } from "@/src/theme/tokens"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { nhisService } from "@/src/services/data/nhisService"
import type { HealthCheckResultDetailRs } from "@/src/types/nhis"

import { TrendChart } from "../components/TrendChart"
import {
  DASHBOARD_MODULES,
  STATUS_COLORS,
  buildSeries,
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

interface ModuleData {
  config: ModuleConfig
  series: MetricSeries[]
  status: MetricStatus | null
}

/** 모듈별 상태 요약 카드 (정상/주의/경고 배지 + 최신 수치 칩) */
function ModuleStatusCard({ data }: { data: ModuleData }) {
  const { config, series, status } = data
  const statusStyle = status ? STATUS_COLORS[status] : null

  return (
    <View style={cardStyles.statusCard}>
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
        <ThemedText style={cardStyles.statusTitle}>{config.title}</ThemedText>
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
              {statusStyle.label}
            </ThemedText>
          </View>
        ) : (
          <View style={[cardStyles.statusBadge, cardStyles.statusBadgeEmpty]}>
            <ThemedText style={cardStyles.statusBadgeEmptyText}>
              기록 없음
            </ThemedText>
          </View>
        )}
      </View>

      {status ? (
        <View style={cardStyles.chipRow}>
          {series
            .filter((s) => s.latest)
            .map((s) => (
              <View key={s.config.key} style={cardStyles.chip}>
                <View
                  style={[
                    cardStyles.chipDot,
                    { backgroundColor: STATUS_COLORS[s.latest!.status].dot },
                  ]}
                />
                <ThemedText style={cardStyles.chipLabel}>
                  {s.config.label.replace(/\s*\(.*\)\s*/, "")}
                </ThemedText>
                <ThemedText style={cardStyles.chipValue}>
                  {s.latest!.value}
                  <ThemedText style={cardStyles.chipUnit}>
                    {" "}
                    {s.config.unit}
                  </ThemedText>
                </ThemedText>
              </View>
            ))}
        </View>
      ) : (
        <ThemedText style={cardStyles.placeholderText}>
          {config.description}
        </ThemedText>
      )}
    </View>
  )
}

/** 개별 지표 추세 차트 카드 */
function MetricChartCard({ series }: { series: MetricSeries }) {
  const latest = series.latest
  const statusStyle = latest ? STATUS_COLORS[latest.status] : null
  return (
    <View style={cardStyles.chartCard}>
      <View style={cardStyles.chartHeader}>
        <View style={cardStyles.chartTitleWrap}>
          <ThemedText style={cardStyles.chartTitle}>
            {series.config.label}
          </ThemedText>
          <ThemedText style={cardStyles.chartRange}>
            {normalRangeText(series.config)} {series.config.unit}
          </ThemedText>
        </View>
        {latest && statusStyle && (
          <View style={cardStyles.chartLatest}>
            <ThemedText
              style={[cardStyles.chartLatestValue, { color: statusStyle.text }]}
            >
              {latest.value}
            </ThemedText>
            <ThemedText style={cardStyles.chartLatestUnit}>
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
  const router = useRouter()

  const [details, setDetails] = useState<HealthCheckResultDetailRs[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const results = await nhisService.getHealthCheckResults()
        const valid = results.filter((r) => !!r.checkupDate)
        const fetched = await Promise.all(
          valid.map((r) =>
            nhisService
              .getHealthCheckResultById(String(r.resultId))
              .catch(() => null),
          ),
        )
        if (cancelled) return
        const ascending = fetched
          .filter((d): d is HealthCheckResultDetailRs => d != null)
          .sort(
            (a, b) =>
              new Date(a.checkupDate.replace(/\./g, "-")).getTime() -
              new Date(b.checkupDate.replace(/\./g, "-")).getTime(),
          )
        setDetails(ascending)
      } catch {
        if (!cancelled) setError("검사 데이터를 불러올 수 없습니다.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const modules = useMemo<ModuleData[]>(() => {
    return DASHBOARD_MODULES.map((config) => {
      const series = config.metrics.map((m) => buildSeries(m, details))
      const withData = series.filter((s) => s.points.length > 0)
      const status = worstStatus(withData.map((s) => s.latest!.status))
      return { config, series, status }
    })
  }, [details])

  const dateRange = useMemo(() => {
    if (details.length === 0) return null
    const first = details[0].checkupDate
    const last = details[details.length - 1].checkupDate
    return first === last ? first : `${first} ~ ${last}`
  }, [details])

  const chartModules = modules.filter((m) => m.status != null)

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title="검사 대시보드"
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tokens.color.sub6.val} />
        </View>
      )}

      {error && !loading && (
        <View style={styles.center}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}

      {!loading && !error && details.length === 0 && (
        <View style={styles.center}>
          <Ionicons name="bar-chart-outline" size={48} color="#C5C8CE" />
          <ThemedText style={styles.emptyText}>
            분석할 검사 기록이 없습니다.
          </ThemedText>
          <ThemedText style={styles.emptySub}>
            건강검진 데이터를 먼저 불러와 주세요.
          </ThemedText>
        </View>
      )}

      {!loading && !error && details.length > 0 && (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* 요약 */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Ionicons
                name="documents-outline"
                size={20}
                color={tokens.color.sub6.val}
              />
            </View>
            <View style={styles.summaryInfo}>
              <ThemedText style={styles.summaryCount}>
                총 {details.length}건의 검진 기록
              </ThemedText>
              {dateRange && (
                <ThemedText style={styles.summaryRange}>{dateRange}</ThemedText>
              )}
            </View>
          </View>

          {/* 모듈별 상태 카드 */}
          <ThemedText style={styles.sectionTitle}>모듈별 상태</ThemedText>
          <View style={styles.moduleGrid}>
            {modules.map((m) => (
              <ModuleStatusCard key={m.config.id} data={m} />
            ))}
          </View>

          {/* 항목별 추세 그래프 */}
          <ThemedText style={styles.sectionTitle}>항목별 추세</ThemedText>
          {chartModules.length === 0 ? (
            <ThemedText style={styles.placeholderText}>
              추세를 그릴 검사 항목이 아직 없습니다.
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
                  <ThemedText style={styles.chartGroupTitle}>
                    {m.config.title}
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

          <View style={styles.legendRow}>
            {(["normal", "caution", "warning"] as MetricStatus[]).map((st) => (
              <View key={st} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: STATUS_COLORS[st].dot },
                  ]}
                />
                <ThemedText style={styles.legendText}>
                  {STATUS_COLORS[st].label}
                </ThemedText>
              </View>
            ))}
            <View style={styles.legendItem}>
              <View style={styles.legendBand} />
              <ThemedText style={styles.legendText}>정상 범위</ThemedText>
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
  },
  errorText: {
    fontSize: 15,
    color: "#64748B",
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
    backgroundColor: "#34D39926",
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
