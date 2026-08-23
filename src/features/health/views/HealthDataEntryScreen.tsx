import React from "react"
import { StyleSheet, View, ScrollView, Pressable } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppRouter } from "@/src/shared/navigation"
import { useTranslation } from "react-i18next"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { tokens } from "@/src/theme/tokens"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { useHealthTheme } from "../hooks/useHealthTheme"

export function HealthDataEntryScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const { t } = useTranslation("health")
  const { healthColors } = useHealthTheme()

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: healthColors.background }]}
    >
      <ScreenHeader
        title={t("entry.header")}
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText
          style={[styles.title, { color: healthColors.text }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("entry.title")}
        </ThemedText>
        <ThemedText
          style={[styles.subtitle, { color: healthColors.textSecondary }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("entry.subtitle")}
        </ThemedText>

        {/* 건강보험공단에서 불러오기 */}
        <Pressable
          style={({ pressed }) => [
            styles.optionCard,
            {
              backgroundColor: healthColors.surface,
              borderColor: healthColors.line,
            },
            pressed && { backgroundColor: healthColors.surfacePressed },
          ]}
          onPress={() => router.push("/(settings)/health-nhis-auth")}
        >
          <View
            style={[
              styles.optionIconWrapper,
              { backgroundColor: healthColors.positiveWeak },
            ]}
          >
            <Ionicons
              name="shield-checkmark"
              size={24}
              color={tokens.color.sub6.val}
            />
          </View>
          <View style={styles.optionContent}>
            <ThemedText
              style={[styles.optionTitle, { color: healthColors.text }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("entry.nhisTitle")}
            </ThemedText>
            <ThemedText
              style={[styles.optionDesc, { color: healthColors.textSecondary }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("entry.nhisDescription")}
            </ThemedText>
            <View
              style={[
                styles.recommendBadge,
                { backgroundColor: healthColors.positiveWeak },
              ]}
            >
              <Ionicons name="flash" size={11} color={tokens.color.sub8.val} />
              <ThemedText
                style={[
                  styles.recommendBadgeText,
                  { color: healthColors.positive },
                ]}
              >
                {t("entry.nhisBadge")}
              </ThemedText>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={healthColors.textAssistive}
          />
        </Pressable>

        {/* 검사지 업로드하기 */}
        <Pressable
          style={({ pressed }) => [
            styles.optionCard,
            {
              backgroundColor: healthColors.surface,
              borderColor: healthColors.line,
            },
            pressed && { backgroundColor: healthColors.surfacePressed },
          ]}
          onPress={() => router.push("/(settings)/health-data-upload")}
        >
          <View
            style={[
              styles.optionIconWrapper,
              { backgroundColor: healthColors.surfaceMuted },
            ]}
          >
            <Ionicons
              name="camera-outline"
              size={24}
              color={healthColors.textAssistive}
            />
          </View>
          <View style={styles.optionContent}>
            <ThemedText
              style={[styles.optionTitle, { color: healthColors.text }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("entry.fileTitle")}
            </ThemedText>
            <ThemedText
              style={[styles.optionDesc, { color: healthColors.textSecondary }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("entry.fileDescription")}
            </ThemedText>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={healthColors.textAssistive}
          />
        </Pressable>

        {/* 대시보드 보기 */}
        <Pressable
          style={({ pressed }) => [
            styles.optionCard,
            {
              backgroundColor: healthColors.surface,
              borderColor: healthColors.line,
            },
            pressed && { backgroundColor: healthColors.surfacePressed },
          ]}
          onPress={() => router.push("/(settings)/health-dashboard")}
        >
          <View
            style={[
              styles.optionIconWrapper,
              { backgroundColor: healthColors.positiveWeak },
            ]}
          >
            <Ionicons
              name="bar-chart-outline"
              size={24}
              color={tokens.color.sub6.val}
            />
          </View>
          <View style={styles.optionContent}>
            <ThemedText
              style={[styles.optionTitle, { color: healthColors.text }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("entry.dashboardTitle")}
            </ThemedText>
            <ThemedText
              style={[styles.optionDesc, { color: healthColors.textSecondary }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("entry.dashboardDescription")}
            </ThemedText>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={healthColors.textAssistive}
          />
        </Pressable>

        {/* 사용 안내 */}
        <View style={styles.securityRow}>
          <Ionicons
            name="information-circle-outline"
            size={13}
            color={healthColors.textAssistive}
          />
          <ThemedText
            style={[styles.securityText, { color: healthColors.textSecondary }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("entry.usageNote")}
          </ThemedText>
        </View>

        {/* 활용 안내 */}
        <View
          style={[
            styles.trustCard,
            {
              backgroundColor: healthColors.surfaceMuted,
              borderColor: healthColors.lineSubtle,
            },
          ]}
        >
          <View
            style={[
              styles.trustIconWrapper,
              { backgroundColor: healthColors.positiveWeak },
            ]}
          >
            <Ionicons
              name="documents-outline"
              size={28}
              color={tokens.color.sub6.val}
            />
          </View>
          <ThemedText
            style={[styles.trustText, { color: healthColors.textSecondary }]}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {t("entry.comparisonNote")}
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700",
    color: "#17191C",
    marginBottom: 12,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
    marginBottom: 28,
  },
  // 옵션 카드
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },

  optionIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionIconWrapperGreen: {
    backgroundColor: "#F0FDF4",
  },
  optionIconWrapperGray: {
    backgroundColor: "#F1F5F9",
  },
  optionContent: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#17191C",
  },
  optionDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: "#64748B",
  },
  recommendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    alignSelf: "flex-start",
    backgroundColor: "#F0FDF4",
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  recommendBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: tokens.color.sub8.val,
  },
  // 사용 안내
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 4,
    marginBottom: 20,
  },
  securityText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  // 활용 안내
  trustCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 14,
  },
  trustIconWrapper: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  trustText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
    textAlign: "center",
  },
})
