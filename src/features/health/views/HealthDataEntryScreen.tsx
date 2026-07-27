import React from "react"
import { StyleSheet, View, ScrollView, Pressable } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { tokens } from "@/src/theme/tokens"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { useHealthTheme } from "../hooks/useHealthTheme"

export function HealthDataEntryScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { healthColors } = useHealthTheme()

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: healthColors.background }]}
    >
      <ScreenHeader
        title="검사 결과 불러오기"
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={[styles.title, { color: healthColors.text }]}>
          {"검사 결과를\n어떻게 가져올까요?"}
        </ThemedText>
        <ThemedText
          style={[styles.subtitle, { color: healthColors.textSecondary }]}
        >
          {"최근 건강검진 결과를 불러와 신장 상태를\n쉽게 설명해드려요."}
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
            >
              건강보험공단에서 불러오기
            </ThemedText>
            <ThemedText
              style={[styles.optionDesc, { color: healthColors.textSecondary }]}
            >
              최근 10년간의 검진 기록을 한 번에 자동으로 가져옵니다. 간편인증이
              필요합니다.
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
                가장 빠르고 정확해요
              </ThemedText>
            </View>
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
            >
              대시보드 보기
            </ThemedText>
            <ThemedText
              style={[styles.optionDesc, { color: healthColors.textSecondary }]}
            >
              불러온 검사 수치의 추세 차트와 신장·전해질·단백뇨 등 모듈별 상태를
              한눈에 확인합니다.
            </ThemedText>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={healthColors.textAssistive}
          />
        </Pressable>

        {/* 보안 안내 */}
        <View style={styles.securityRow}>
          <Ionicons
            name="lock-closed-outline"
            size={13}
            color={healthColors.textAssistive}
          />
          <ThemedText
            style={[styles.securityText, { color: healthColors.textSecondary }]}
          >
            데이터는 암호화되어 안전하게 보호됩니다
          </ThemedText>
        </View>

        {/* 신뢰 카드 */}
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
            <View style={styles.trustIconBadge}>
              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
            </View>
          </View>
          <ThemedText
            style={[styles.trustText, { color: healthColors.textSecondary }]}
          >
            {
              '"신신당부는 보건복지부 가이드라인을 준수하며\n여러분의 소중한 정보를 철저히 관리합니다."'
            }
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
  optionCardPressed: {
    backgroundColor: "#F8FAFC",
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
  // 보안 안내
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
  // 신뢰 카드
  trustCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 14,
  },
  trustIconWrapper: {
    position: "relative",
    width: 44,
    height: 44,
  },
  trustIconBadge: {
    position: "absolute",
    bottom: -2,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: tokens.color.sub6.val,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F8FAFC",
  },
  trustText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
    textAlign: "center",
  },
})
