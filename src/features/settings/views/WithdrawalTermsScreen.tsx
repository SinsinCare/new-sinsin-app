import React, { useState } from "react"
import { StyleSheet, View, ScrollView, Pressable } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"
import { useTranslation } from "react-i18next"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { DotItem } from "@/src/features/settings/components"
import { userService } from "@/src/services/auth"
import { clearClientSession } from "@/src/services/core/sessionCleanup"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import { logger } from "@/src/lib/logger"
import { presentError } from "@/src/lib/errorMessage"
import { showConfirm } from "@/src/lib/dialog"

const WITHDRAWAL_TERM_KEYS = [
  "withdrawal.terms.1",
  "withdrawal.terms.2",
  "withdrawal.terms.3",
] as const

export function WithdrawalTermsScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const { reason, detail, deleteMyPosts } = useLocalSearchParams<{
    reason?: string
    detail?: string
    deleteMyPosts?: string
  }>()
  const c = useSettingsColors()
  const { t } = useTranslation("settings")

  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleWithdraw = async () => {
    const confirmed = await showConfirm({
      title: t("withdrawal.confirmTitle"),
      description: t("withdrawal.confirmBody"),
      confirmLabel: t("withdrawal.withdraw"),
      destructive: true,
    })
    if (!confirmed) return

    setLoading(true)
    try {
      await userService.deleteAccount(
        reason || t("withdrawal.defaultReason"),
        detail?.trim() || null,
        deleteMyPosts === "true",
      )
      await clearClientSession()
      router.replace("/(settings)/withdrawal-complete")
    } catch (err) {
      logger.error("[WithdrawalTermsScreen] 탈퇴 실패", err)
      // 재시도 핸들러는 주지 않는다. 토스트 버튼 한 번으로 계정 삭제가 다시 나가는
      // 것은 이 동작의 무게에 맞지 않는다 — 확인 다이얼로그부터 다시 거치게 둔다.
      // `WITHDRAW_ERROR_001`(이미 접수된 탈퇴)은 카탈로그가 로그인 버튼을 붙여 준다.
      presentError(err, {
        scope: "account-withdraw",
        fallback: t("withdrawal.errorTitle"),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("shared.back")}
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </Pressable>

        <ThemedText style={[styles.title, { color: c.text }]}>
          {t("withdrawal.termsTitle")}
        </ThemedText>

        <DotItem text={t("withdrawal.notice")} />

        <ThemedText style={[styles.sectionTitle, { color: c.text }]}>
          {t("withdrawal.termsSection")}
        </ThemedText>
        <View style={styles.termsList}>
          {WITHDRAWAL_TERM_KEYS.map((key) => (
            <DotItem key={key} text={t(key)} />
          ))}
        </View>

        <Pressable
          style={[styles.agreementBox, { backgroundColor: c.secondaryBg }]}
          onPress={() => setAgreed((v) => !v)}
        >
          <Ionicons
            name={agreed ? "checkbox" : "square-outline"}
            size={20}
            color={agreed ? c.text : c.textSub}
          />
          <ThemedText
            style={[
              styles.agreementText,
              { color: c.textSub },
              agreed && { color: c.text },
            ]}
          >
            {t("withdrawal.agreement")}
          </ThemedText>
        </Pressable>
      </ScrollView>

      <BottomActionBar
        label={t("withdrawal.withdraw")}
        disabled={!agreed || loading}
        onPress={handleWithdraw}
      />
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 32,
    alignSelf: "flex-start",
  },
  title: {
    fontSize: 22,
    lineHeight: 22 * 1.2,
    fontWeight: "600",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    marginTop: 24,
    marginBottom: 12,
  },
  termsList: {
    gap: 8,
  },
  agreementBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 32,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  agreementText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
  },
})
