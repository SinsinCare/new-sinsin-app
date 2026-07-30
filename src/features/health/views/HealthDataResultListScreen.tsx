import React, { useState } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { tokens } from "@/src/theme/tokens"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { Button } from "@/src/shared/components/Button"
import type { HealthCheckResultsRs } from "@/src/types/nhis"
import { healthResultsQueryOptions } from "../data/healthQueries"
import { formatHealthDate } from "../data/dashboardMetrics"
import { useHealthTheme } from "../hooks/useHealthTheme"

function ResultRow({
  item,
  onPress,
  language,
}: {
  item: HealthCheckResultsRs
  onPress: () => void
  language: string
}) {
  const { healthColors } = useHealthTheme()
  return (
    <Pressable
      style={({ pressed }) => [
        rowStyles.row,
        { borderBottomColor: healthColors.lineSubtle },
        pressed && { backgroundColor: healthColors.surfacePressed },
      ]}
      onPress={onPress}
    >
      <View style={rowStyles.info}>
        <ThemedText style={[rowStyles.date, { color: healthColors.text }]}>
          {formatHealthDate(item.checkupDate, language)}
        </ThemedText>
        <ThemedText
          style={[rowStyles.place, { color: healthColors.textSecondary }]}
        >
          {item.checkupPlace}
        </ThemedText>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={healthColors.textAssistive}
      />
    </Pressable>
  )
}

export function HealthDataResultListScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { t, i18n } = useTranslation("health")
  const language = i18n.resolvedLanguage ?? i18n.language
  const { healthColors } = useHealthTheme()
  const {
    data: results = [],
    isLoading: loading,
    isError,
    isFetching,
    refetch,
  } = useQuery(healthResultsQueryOptions())
  const error = isError ? t("result.loadError") : null
  const [activeTab, setActiveTab] = useState<"recent" | "all">("recent")

  const handleRowPress = (resultId: number) => {
    router.push({
      pathname: "/(settings)/health-result-detail",
      params: { resultId: String(resultId) },
    })
  }

  const sortedResults = [...results]
    .filter((item) => !!item.checkupDate)
    .sort(
      (a, b) =>
        new Date(b.checkupDate).getTime() - new Date(a.checkupDate).getTime(),
    )
  const latestResult = sortedResults[0]

  const resultsByYear = sortedResults.reduce<
    Record<string, HealthCheckResultsRs[]>
  >((acc, item) => {
    const year = item.checkupDate.slice(0, 4)
    if (!acc[year]) acc[year] = []
    acc[year].push(item)
    return acc
  }, {})
  const sortedYears = Object.keys(resultsByYear).sort(
    (a, b) => Number(b) - Number(a),
  )

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: healthColors.background }]}
    >
      <ScreenHeader
        title={t("result.title")}
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      <View
        style={[styles.tabBar, { borderBottomColor: healthColors.lineSubtle }]}
      >
        {(["recent", "all"] as const).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <ThemedText
              style={[
                styles.tabText,
                { color: healthColors.textAssistive },
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab === "recent" ? t("result.recentTab") : t("result.allTab")}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tokens.color.sub6.val} />
        </View>
      )}

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

      {!loading && !error && results.length === 0 && (
        <View style={styles.center}>
          <Ionicons
            name="document-outline"
            size={48}
            color={healthColors.textAssistive}
          />
          <ThemedText style={[styles.emptyText, { color: healthColors.text }]}>
            {t("result.listEmpty")}
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

      {!loading && !error && results.length > 0 && (
        <>
          {activeTab === "recent" ? (
            <ScrollView
              bounces={false}
              overScrollMode="never"
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: insets.bottom + 40 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.countRow}>
                <ThemedText
                  style={[
                    styles.countText,
                    { color: healthColors.textSecondary },
                  ]}
                >
                  {t("result.resultCount", { count: results.length })}
                </ThemedText>
                <Pressable onPress={() => setActiveTab("all")}>
                  <ThemedText style={styles.viewAllText}>
                    {t("result.viewAll")}
                  </ThemedText>
                </Pressable>
              </View>

              {latestResult && (
                <Pressable
                  style={[
                    styles.latestCard,
                    {
                      backgroundColor: healthColors.positiveWeak,
                      borderColor: healthColors.positive,
                    },
                  ]}
                  onPress={() => handleRowPress(latestResult.resultId)}
                >
                  <View style={styles.latestCardHeader}>
                    <View style={styles.latestBadge}>
                      <ThemedText style={styles.latestBadgeText}>
                        {t("result.latest")}
                      </ThemedText>
                    </View>
                    <ThemedText
                      style={[styles.latestDate, { color: healthColors.text }]}
                    >
                      {formatHealthDate(latestResult.checkupDate, language)}
                    </ThemedText>
                  </View>
                  <ThemedText
                    style={[
                      styles.latestPlace,
                      { color: healthColors.textSecondary },
                    ]}
                  >
                    {latestResult.checkupPlace}
                  </ThemedText>
                  <View style={styles.latestCardFooter}>
                    <ThemedText style={styles.latestDetailText}>
                      {t("result.viewDetails")}
                    </ThemedText>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={tokens.color.sub6.val}
                    />
                  </View>
                </Pressable>
              )}

              <View style={styles.listSection}>
                {sortedResults.slice(1).map((item) => (
                  <ResultRow
                    key={item.resultId}
                    item={item}
                    language={language}
                    onPress={() => handleRowPress(item.resultId)}
                  />
                ))}
              </View>
            </ScrollView>
          ) : (
            <ScrollView
              bounces={false}
              overScrollMode="never"
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: insets.bottom + 40 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {sortedYears.map((year) => (
                <View key={year}>
                  <View
                    style={[
                      styles.yearHeader,
                      {
                        backgroundColor: healthColors.surfaceMuted,
                        borderBottomColor: healthColors.lineSubtle,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[styles.yearText, { color: healthColors.text }]}
                    >
                      {t("result.year", { year })}
                    </ThemedText>
                  </View>
                  {resultsByYear[year].map((item) => (
                    <ResultRow
                      key={item.resultId}
                      item={item}
                      language={language}
                      onPress={() => handleRowPress(item.resultId)}
                    />
                  ))}
                </View>
              ))}
            </ScrollView>
          )}
        </>
      )}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: tokens.color.sub6.val,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94A3B8",
  },
  tabTextActive: {
    color: tokens.color.sub6.val,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 15,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 22,
  },
  stateAction: {
    width: 200,
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  countText: {
    fontSize: 14,
    color: "#374151",
  },
  countHighlight: {
    fontWeight: "700",
    color: tokens.color.sub8.val,
  },
  viewAllText: {
    fontSize: 13,
    color: tokens.color.sub6.val,
    fontWeight: "500",
  },
  latestCard: {
    backgroundColor: "#F0FDF9",
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    gap: 6,
  },
  latestCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  latestBadge: {
    backgroundColor: tokens.color.sub6.val,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  latestBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  latestDate: {
    fontSize: 17,
    fontWeight: "700",
    color: "#17191C",
  },
  latestPlace: {
    fontSize: 14,
    color: "#64748B",
  },
  latestCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  latestDetailText: {
    fontSize: 13,
    fontWeight: "600",
    color: tokens.color.sub6.val,
  },
  listSection: {
    gap: 0,
  },
  yearHeader: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
    marginBottom: 4,
    marginTop: 8,
  },
  yearText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },
})

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  rowPressed: {
    backgroundColor: "#FAFAFA",
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  date: {
    fontSize: 15,
    fontWeight: "600",
    color: "#17191C",
  },
  place: {
    fontSize: 13,
    color: "#64748B",
  },
})
