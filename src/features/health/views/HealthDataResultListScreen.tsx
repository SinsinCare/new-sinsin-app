import React, { useEffect, useState } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { nhisService } from "@/src/services/data/nhisService"
import type { HealthCheckResultsRs } from "@/src/types/nhis"

function ResultRow({
  item,
  onPress,
}: {
  item: HealthCheckResultsRs
  onPress: () => void
}) {
  return (
    <Pressable
      style={({ pressed }) => [rowStyles.row, pressed && rowStyles.rowPressed]}
      onPress={onPress}
    >
      <View style={rowStyles.info}>
        <ThemedText style={rowStyles.date}>{item.checkupDate}</ThemedText>
        <ThemedText style={rowStyles.place}>{item.checkupPlace}</ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#C5C8CE" />
    </Pressable>
  )
}

export function HealthDataResultListScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [results, setResults] = useState<HealthCheckResultsRs[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"recent" | "all">("recent")

  useEffect(() => {
    nhisService
      .getHealthCheckResults()
      .then(setResults)
      .catch(() => setError("결과를 불러올 수 없습니다."))
      .finally(() => setLoading(false))
  }, [])

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
    <ThemedView style={styles.container}>
      <ScreenHeader
        title="검진 결과 목록"
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      <View style={styles.tabBar}>
        {(["recent", "all"] as const).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab === "recent" ? "최근 검사 보기" : "전체 결과 보기"}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#44AF94" />
        </View>
      )}

      {error && !loading && (
        <View style={styles.center}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}

      {!loading && !error && results.length === 0 && (
        <View style={styles.center}>
          <Ionicons name="document-outline" size={48} color="#C5C8CE" />
          <ThemedText style={styles.emptyText}>
            검진 결과가 없습니다.
          </ThemedText>
        </View>
      )}

      {!loading && !error && results.length > 0 && (
        <>
          {activeTab === "recent" ? (
            <ScrollView
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: insets.bottom + 40 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.countRow}>
                <ThemedText style={styles.countText}>
                  가져온 결과{" "}
                  <ThemedText style={styles.countHighlight}>
                    {results.length}건
                  </ThemedText>
                </ThemedText>
                <Pressable onPress={() => setActiveTab("all")}>
                  <ThemedText style={styles.viewAllText}>전체 보기</ThemedText>
                </Pressable>
              </View>

              {latestResult && (
                <Pressable
                  style={styles.latestCard}
                  onPress={() => handleRowPress(latestResult.resultId)}
                >
                  <View style={styles.latestCardHeader}>
                    <View style={styles.latestBadge}>
                      <ThemedText style={styles.latestBadgeText}>
                        최근
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.latestDate}>
                      {latestResult.checkupDate}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.latestPlace}>
                    {latestResult.checkupPlace}
                  </ThemedText>
                  <View style={styles.latestCardFooter}>
                    <ThemedText style={styles.latestDetailText}>
                      상세 결과 보기
                    </ThemedText>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color="#44AF94"
                    />
                  </View>
                </Pressable>
              )}

              <View style={styles.listSection}>
                {sortedResults.slice(1).map((item) => (
                  <ResultRow
                    key={item.resultId}
                    item={item}
                    onPress={() => handleRowPress(item.resultId)}
                  />
                ))}
              </View>
            </ScrollView>
          ) : (
            <ScrollView
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: insets.bottom + 40 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {sortedYears.map((year) => (
                <View key={year}>
                  <View style={styles.yearHeader}>
                    <ThemedText style={styles.yearText}>{year}년</ThemedText>
                  </View>
                  {resultsByYear[year].map((item) => (
                    <ResultRow
                      key={item.resultId}
                      item={item}
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
    borderBottomColor: "#44AF94",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94A3B8",
  },
  tabTextActive: {
    color: "#44AF94",
    fontWeight: "600",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: "#64748B",
  },
  emptyText: {
    fontSize: 15,
    color: "#94A3B8",
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
    color: "#0D896A",
  },
  viewAllText: {
    fontSize: 13,
    color: "#44AF94",
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
    backgroundColor: "#44AF94",
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
    color: "#44AF94",
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
