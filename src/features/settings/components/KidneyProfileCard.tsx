import React from "react"
import { View, Pressable, StyleSheet, Platform } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"

import { ThemedText } from "@/components/themed-text"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import { tokens } from "@/src/theme/tokens"

const COMORBIDITY_LABEL: Record<string, string> = {
  DIABETES: "당뇨",
  HYPERTENSION: "고혈압",
  HEART_DISEASE: "심장질환",
  GOUT: "통풍",
  ANEMIA: "빈혈",
  BONE_MINERAL: "골미네랄 장애",
}

const DIAGNOSIS_CAUSE_LABEL: Record<string, string> = {
  DIABETIC_KIDNEY_DISEASE: "당뇨병성 신장 질환",
  HYPERTENSION: "고혈압",
  GLOMERULONEPHRITIS: "사구체신염",
  POLYCYSTIC_KIDNEY_DISEASE: "다낭성 신장 질환",
  OTHER: "기타",
}

function localizeComorbidity(key: string): string {
  return COMORBIDITY_LABEL[key] ?? COMORBIDITY_LABEL[key.toUpperCase()] ?? key
}

function localizeDiagnosisCause(key: string): string {
  return (
    DIAGNOSIS_CAUSE_LABEL[key] ??
    DIAGNOSIS_CAUSE_LABEL[key.toUpperCase()] ??
    key
  )
}

interface KidneyProfileCardProps {
  ckdStageLabel: string | null
  isDialysis: boolean
  heightCm?: number | null
  weightKg: number | null
  diagnosisDate: string | null
  diagnosisCauses?: string[]
  diagnosisCauseOther?: string | null
  comorbidities?: string[]
  onEditPress: () => void
}

export function KidneyProfileCard({
  ckdStageLabel,
  isDialysis,
  heightCm,
  weightKg,
  diagnosisDate,
  diagnosisCauses,
  diagnosisCauseOther,
  comorbidities,
  onEditPress,
}: KidneyProfileCardProps) {
  const c = useSettingsColors()

  const gradientColors: [string, string] = c.isDark
    ? ["rgba(114, 223, 196, 0.08)", "rgba(49, 49, 56, 0.8)"]
    : ["rgba(114, 223, 196, 0.16)", "rgba(233, 250, 246, 0.16)"]

  const heightWeightLabel = (() => {
    if (heightCm != null && weightKg != null)
      return `${heightCm}cm / ${weightKg}kg`
    if (weightKg != null) return `${weightKg}kg`
    return "미입력"
  })()
  const conditionItems = [
    ...(diagnosisCauses ?? []).map(localizeDiagnosisCause),
    ...(diagnosisCauseOther ? [diagnosisCauseOther] : []),
    ...(comorbidities ?? []).map(localizeComorbidity),
  ]

  return (
    <View
      style={[
        styles.shadowOuter,
        { backgroundColor: c.cardBg },
        c.isDark && styles.shadowOuterDark,
      ]}
    >
      <View style={[styles.shadowInner, { backgroundColor: c.cardBg }]}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0.511, y: 1 }}
          end={{ x: 0.489, y: 0 }}
          locations={[0.1032, 1]}
          style={styles.gradientBox}
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <ThemedText style={styles.title}>나의 신장 프로필</ThemedText>
            <Pressable onPress={onEditPress} hitSlop={8}>
              <ThemedText style={styles.editBtn}>수정하기</ThemedText>
            </Pressable>
          </View>

          {/* CKD 병기 */}
          <View
            style={[
              styles.ckdRow,
              { backgroundColor: c.isDark ? "#2A2A32" : "#FFFFFF" },
            ]}
          >
            <View
              style={[
                styles.ckdIconSquare,
                { backgroundColor: c.isDark ? "#1A3A2E" : "#F0FDF4" },
              ]}
            >
              <Ionicons
                name="bar-chart-outline"
                size={24}
                color={tokens.color.sub8.val}
              />
            </View>
            <View style={styles.ckdTextBlock}>
              <View style={styles.ckdLabelRow}>
                <ThemedText style={[styles.ckdLabel, { color: c.textSub }]}>
                  신장 병기 (CKD)
                </ThemedText>
                <ThemedText style={[styles.ckdDialysis, { color: c.textSub }]}>
                  {isDialysis ? "투석 중" : "투석 안함"}
                </ThemedText>
              </View>
              <ThemedText style={[styles.ckdValue, { color: c.text }]}>
                {ckdStageLabel ?? "미입력"}
              </ThemedText>
            </View>
          </View>

          {/* 키·체중 & 진단 시기 */}
          <View style={styles.infoBoxRow}>
            <View
              style={[
                styles.infoBox,
                { backgroundColor: c.isDark ? "#2A2A32" : "#FFFFFF" },
              ]}
            >
              <ThemedText style={[styles.infoBoxTitle, { color: c.textSub }]}>
                키 / 체중
              </ThemedText>
              <ThemedText style={[styles.infoBoxValue, { color: c.text }]}>
                {heightWeightLabel}
              </ThemedText>
            </View>
            <View
              style={[
                styles.infoBox,
                { backgroundColor: c.isDark ? "#2A2A32" : "#FFFFFF" },
              ]}
            >
              <ThemedText style={[styles.infoBoxTitle, { color: c.textSub }]}>
                진단 시기
              </ThemedText>
              <ThemedText style={[styles.infoBoxValue, { color: c.text }]}>
                {diagnosisDate ?? "미입력"}
              </ThemedText>
            </View>
          </View>

          {/* 동반 질환 및 진단 원인 */}
          {conditionItems.length > 0 && (
            <View style={styles.comorbiditySection}>
              <View style={styles.comorbidityHeader}>
                <Ionicons
                  name="grid-outline"
                  size={14}
                  color={tokens.color.sub8.val}
                />
                <ThemedText style={styles.comorbidityTitle}>
                  동반 질환 및 진단 원인
                </ThemedText>
              </View>
              <View style={styles.comorbidityChips}>
                {conditionItems.map((item, index) => (
                  <View
                    key={`${item}-${index}`}
                    style={[
                      styles.comorbidityChip,
                      {
                        backgroundColor: c.isDark ? "#2A2A32" : "#FFFFFF",
                        borderColor: c.isDark ? "#3A3A42" : "#E0E0E0",
                      },
                    ]}
                  >
                    <ThemedText
                      style={[styles.comorbidityChipText, { color: c.text }]}
                    >
                      {item}
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
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.122,
        shadowRadius: 7.6,
      },
      android: { elevation: 4 },
    }),
  },
  shadowOuterDark: {
    ...Platform.select({
      ios: { shadowOpacity: 0.3 },
    }),
  },
  shadowInner: {
    borderRadius: 16,
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
    color: tokens.color.sub8.val,
  },
  editBtn: {
    fontSize: 14,
    fontWeight: "500",
    color: tokens.color.sub8.val,
  },
  ckdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    padding: 14,
  },
  ckdIconSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ckdTextBlock: { flex: 1, gap: 2 },
  ckdLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ckdLabel: { fontSize: 12, fontWeight: "500" },
  ckdValue: { fontSize: 18, fontWeight: "700" },
  ckdDialysis: { fontSize: 14, fontWeight: "500" },
  infoBoxRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 10,
  },
  infoBox: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    gap: 2,
  },
  infoBoxTitle: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  infoBoxValue: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 28,
  },
  comorbiditySection: {
    marginTop: 14,
    gap: 8,
  },
  comorbidityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  comorbidityTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: tokens.color.sub8.val,
  },
  comorbidityChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  comorbidityChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 13,
  },
  comorbidityChipText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
})
