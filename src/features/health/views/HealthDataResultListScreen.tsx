import React, { useState } from "react"
import { StyleSheet, View, ScrollView, Pressable } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { MOCK_LAB_RECORDS, AI_INSIGHT } from "@/src/features/health/data/mock"
import type { LabResultStatus, LabRecord } from "@/src/features/health/types"

const STATUS_CONFIG: Record<LabResultStatus, { label: string; color: string; bg: string }> = {
  normal: { label: "정상", color: "#0D896A", bg: "#F0FDF4" },
  caution: { label: "경계", color: "#D97706", bg: "#FFFBEB" },
  warning: { label: "주의", color: "#DC2626", bg: "#FEF2F2" },
}

function LabValueCard({ item }: { item: (typeof MOCK_LAB_RECORDS)[0]["values"][0] }) {
  const status = STATUS_CONFIG[item.status]
  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.header}>
        <View style={cardStyles.nameBlock}>
          <ThemedText style={cardStyles.name}>{item.name}</ThemedText>
          <ThemedText style={cardStyles.nameEn}>{item.nameEn}</ThemedText>
        </View>
        <View style={[cardStyles.badge, { backgroundColor: status.bg }]}>
          <ThemedText style={[cardStyles.badgeText, { color: status.color }]}>
            {status.label}
          </ThemedText>
        </View>
      </View>
      <View style={cardStyles.valueRow}>
        <ThemedText style={cardStyles.value}>
          {item.value}
          <ThemedText style={cardStyles.unit}> {item.unit}</ThemedText>
        </ThemedText>
        <ThemedText style={cardStyles.normalRange}>정상 {item.normalRange}</ThemedText>
      </View>
      {item.tags && item.tags.length > 0 && (
        <View style={cardStyles.tagsRow}>
          {item.tags.map((tag) => (
            <View key={tag} style={cardStyles.tag}>
              <ThemedText style={cardStyles.tagText}>{tag}</ThemedText>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function RecordRow({ record, selected, onToggle }: {
  record: LabRecord
  selected: boolean
  onToggle: () => void
}) {
  const allNormal = record.values.every((v) => v.status === "normal")
  const hasCaution = record.values.some((v) => v.status === "caution")
  const status: LabResultStatus = allNormal ? "normal" : hasCaution ? "caution" : "warning"
  const statusConf = STATUS_CONFIG[status]

  return (
    <Pressable
      style={({ pressed }) => [rowStyles.row, pressed && rowStyles.rowPressed]}
      onPress={onToggle}
    >
      <View style={[rowStyles.checkbox, selected && rowStyles.checkboxSelected]}>
        {selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
      </View>
      <View style={rowStyles.info}>
        <View style={rowStyles.titleRow}>
          <ThemedText style={rowStyles.date}>{record.displayDate} {record.type}</ThemedText>
          <View style={[rowStyles.badge, { backgroundColor: statusConf.bg }]}>
            <ThemedText style={[rowStyles.badgeText, { color: statusConf.color }]}>
              {statusConf.label}
            </ThemedText>
          </View>
        </View>
        <View style={rowStyles.tagsRow}>
          {record.values.slice(0, 3).map((v) => (
            <View key={v.id} style={rowStyles.tag}>
              <ThemedText style={rowStyles.tagText}>{v.nameEn}</ThemedText>
            </View>
          ))}
          {record.values.length > 3 && (
            <ThemedText style={rowStyles.moreText}>+{record.values.length - 3}</ThemedText>
          )}
        </View>
      </View>
    </Pressable>
  )
}

export function HealthDataResultListScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"recent" | "all">("recent")
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const latestRecord = MOCK_LAB_RECORDS[0]

  const recordsByYear = MOCK_LAB_RECORDS.reduce<Record<number, LabRecord[]>>((acc, record) => {
    if (!acc[record.year]) acc[record.year] = []
    acc[record.year].push(record)
    return acc
  }, {})
  const sortedYears = Object.keys(recordsByYear)
    .map(Number)
    .sort((a, b) => b - a)

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title="검진 결과 목록"
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      {/* 탭 */}
      <View style={styles.tabBar}>
        {(["recent", "all"] as const).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <ThemedText style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "recent" ? "최근 검사 보기" : "전체 결과 보기"}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {activeTab === "recent" ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* 가져온 결과 수 */}
          <View style={styles.countRow}>
            <ThemedText style={styles.countText}>
              가져온 결과 <ThemedText style={styles.countHighlight}>{MOCK_LAB_RECORDS.length}건</ThemedText>
            </ThemedText>
            <Pressable onPress={() => setActiveTab("all")}>
              <ThemedText style={styles.viewAllText}>전체 보기</ThemedText>
            </Pressable>
          </View>

          {/* AI Insight */}
          <View style={styles.aiCard}>
            <View style={styles.aiCardHeader}>
              <Ionicons name="sparkles" size={16} color="#44AF94" />
              <ThemedText style={styles.aiCardTitle}>AI Insight</ThemedText>
            </View>
            <ThemedText style={styles.aiCardText}>{AI_INSIGHT}</ThemedText>
          </View>

          {/* 최근 검사 날짜 */}
          <View style={styles.recordDateRow}>
            <ThemedText style={styles.recordDate}>{latestRecord.date} 시점 데이터</ThemedText>
          </View>

          {/* 개별 수치 카드 */}
          {latestRecord.values.map((v) => (
            <LabValueCard key={v.id} item={v} />
          ))}
        </ScrollView>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
            showsVerticalScrollIndicator={false}
          >
            {sortedYears.map((year) => (
              <View key={year}>
                <View style={styles.yearHeader}>
                  <ThemedText style={styles.yearText}>{year}년</ThemedText>
                </View>
                {recordsByYear[year].map((record) => (
                  <RecordRow
                    key={record.id}
                    record={record}
                    selected={selectedIds.includes(record.id)}
                    onToggle={() => toggleSelect(record.id)}
                  />
                ))}
              </View>
            ))}
          </ScrollView>

          {selectedIds.length > 0 && (
            <View style={[styles.selectionBar, { paddingBottom: insets.bottom + 12 }]}>
              <Pressable style={styles.selectionButton}>
                <ThemedText style={styles.selectionButtonText}>
                  {selectedIds.length}개의 검사지 선택됨
                </ThemedText>
              </Pressable>
            </View>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  // recent tab
  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
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
  aiCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  aiCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  aiCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0D896A",
  },
  aiCardText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
  },
  recordDateRow: {
    marginBottom: 12,
  },
  recordDate: {
    fontSize: 12,
    color: "#94A3B8",
  },
  // all tab
  yearHeader: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
    marginBottom: 4,
  },
  yearText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },
  selectionBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F2F5",
  },
  selectionButton: {
    backgroundColor: "#44AF94",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
  },
  selectionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
})

const cardStyles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "#F0F2F5",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  nameBlock: {
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#17191C",
  },
  nameEn: {
    fontSize: 12,
    color: "#94A3B8",
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  valueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    color: "#17191C",
  },
  unit: {
    fontSize: 13,
    fontWeight: "400",
    color: "#64748B",
  },
  normalRange: {
    fontSize: 12,
    color: "#94A3B8",
  },
  tagsRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    color: "#64748B",
  },
})

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  rowPressed: {
    backgroundColor: "#FAFAFA",
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: "#44AF94",
    borderColor: "#44AF94",
  },
  info: {
    flex: 1,
    gap: 6,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontSize: 15,
    fontWeight: "500",
    color: "#17191C",
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tagsRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    alignItems: "center",
  },
  tag: {
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    color: "#64748B",
  },
  moreText: {
    fontSize: 11,
    color: "#94A3B8",
  },
})
