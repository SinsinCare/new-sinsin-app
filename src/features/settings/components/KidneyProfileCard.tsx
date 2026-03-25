import React from "react"
import { View, Pressable, StyleSheet, Platform } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"

import { ThemedText } from "@/components/themed-text"

const COMORBIDITY_LABEL: Record<string, string> = {
  DIABETES: "당뇨",
  HYPERTENSION: "고혈압",
  HEART_DISEASE: "심장질환",
  GOUT: "통풍",
  ANEMIA: "빈혈",
  BONE_MINERAL: "골미네랄 장애",
}

function localizeComorbidity(key: string): string {
  return COMORBIDITY_LABEL[key] ?? COMORBIDITY_LABEL[key.toUpperCase()] ?? key
}

interface KidneyProfileCardProps {
  ckdStageLabel: string
  isDialysis: boolean
  weightKg: number | null
  diagnosisDate: string | null
  comorbidities?: string[]
  onEditPress: () => void
}

export function KidneyProfileCard({
  ckdStageLabel,
  isDialysis,
  weightKg,
  diagnosisDate,
  comorbidities,
  onEditPress,
}: KidneyProfileCardProps) {

  return (
    <View style={styles.shadowOuter}>
      <View style={styles.shadowInner}>
        <LinearGradient
          colors={["rgba(114, 223, 196, 0.16)", "rgba(233, 250, 246, 0.16)"]}
          start={{ x: 0.511, y: 1 }}
          end={{ x: 0.489, y: 0 }}
          locations={[0.1032, 1]}
          style={styles.gradientBox}
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <ThemedText style={styles.title}>나의 신장 프로필</ThemedText>
            {/* <Pressable hitSlop={8} onPress={onEditPress}>
              <ThemedText style={styles.editButton}>수정하기</ThemedText>
            </Pressable> */}
          </View>

          {/* CKD 병기 */}
          <View style={styles.ckdRow}>
            <View style={styles.ckdIconSquare}>
              <Ionicons name="bar-chart-outline" size={24} color="#0D896A" />
            </View>
            <View style={styles.ckdTextBlock}>
              <ThemedText style={styles.ckdLabel}>신장 병기 (CKD)</ThemedText>
              <ThemedText style={styles.ckdValue}>
                {ckdStageLabel}{" "}
                <ThemedText style={styles.ckdDialysis}>
                  ({isDialysis ? "투석 중" : "투석 안함"})
                </ThemedText>
              </ThemedText>
            </View>
          </View>

          {/* 체중 & 진단시기 */}
          <View style={styles.infoBoxRow}>
            <View style={styles.infoBox}>
              <ThemedText style={styles.infoBoxTitle}>체중</ThemedText>
              <ThemedText style={styles.infoBoxValue}>
                {weightKg != null ? `${weightKg}kg` : "미입력"}
              </ThemedText>
            </View>
            <View style={styles.infoBox}>
              <ThemedText style={styles.infoBoxTitle}>진단시기</ThemedText>
              <ThemedText style={styles.infoBoxValue}>
                {diagnosisDate ?? "미입력"}
              </ThemedText>
            </View>
          </View>

          {/* 동반 질환 */}
          {comorbidities && comorbidities.length > 0 && (
            <View style={styles.comorbiditySection}>
              <View style={styles.comorbidityHeader}>
                <Ionicons name="ellipse" size={11} color="#0D896A" />
                <ThemedText style={styles.comorbidityTitle}>
                  동반 질환
                </ThemedText>
              </View>
              <View style={styles.comorbidityChips}>
                {comorbidities.map((item) => (
                  <View key={item} style={styles.comorbidityChip}>
                    <ThemedText style={styles.comorbidityChipText}>
                      {localizeComorbidity(item)}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}
        </LinearGradient>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  shadowOuter: {
    borderRadius: 16,
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.122,
        shadowRadius: 7.6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  shadowInner: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: -2, height: -1 },
        shadowOpacity: 0.051,
        shadowRadius: 4.3,
      },
    }),
  },
  gradientBox: {
    borderRadius: 16,
    padding: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0D896A",
  },
  editButton: {
    fontSize: 13,
    color: "#666677",
  },
  ckdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
  },
  ckdIconSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ckdTextBlock: {
    gap: 2,
  },
  ckdLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  ckdValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#17191C",
  },
  ckdDialysis: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
  },
  infoBoxRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 10,
  },
  infoBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    gap: 2,
  },
  infoBoxTitle: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
    color: "#64748B",
  },
  infoBoxValue: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 28,
    color: "#474758",
  },
  comorbiditySection: {
    marginTop: 14,
    gap: 8,
  },
  comorbidityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  comorbidityTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: "#0D896A",
  },
  comorbidityChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  comorbidityChip: {
    backgroundColor: "#FFFFFFBA",
    borderWidth: 1,
    borderColor: "#51D1B0",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  comorbidityChipText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: "#474758",
  },
})
