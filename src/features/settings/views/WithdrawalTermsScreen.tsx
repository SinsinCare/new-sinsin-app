import React, { useState } from "react"
import { StyleSheet, View, ScrollView, Pressable, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { ConfirmModal } from "@/src/shared/components/ConfirmModal"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { DotItem } from "@/src/features/settings/components"
import {
  WITHDRAWAL_NOTICE,
  WITHDRAWAL_TERMS,
} from "@/src/features/settings/data/constants"
import { userService } from "@/src/services/auth"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import { logger } from "@/src/lib/logger"

export function WithdrawalTermsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const c = useSettingsColors()

  const [agreed, setAgreed] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleWithdraw = async () => {
    setModalVisible(false)
    setLoading(true)
    try {
      await userService.deleteAccount()
      router.push("/(settings)/withdrawal-complete")
    } catch (err) {
      logger.error("[WithdrawalTermsScreen] 탈퇴 실패", err)
      Alert.alert("오류", "탈퇴 처리 중 문제가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </Pressable>

        <ThemedText style={[styles.title, { color: c.text }]}>
          {"신신당부를 떠나기 전에\n꼭 확인해주세요"}
        </ThemedText>

        <DotItem text={WITHDRAWAL_NOTICE} />

        <ThemedText style={[styles.sectionTitle, { color: c.text }]}>
          탈퇴 약관
        </ThemedText>
        <View style={styles.termsList}>
          {WITHDRAWAL_TERMS.map((term, i) => (
            <DotItem key={i} text={term} />
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
            유의사항 숙지 후 탈퇴에 동의합니다.
          </ThemedText>
        </Pressable>
      </ScrollView>

      <BottomActionBar
        label="탈퇴하기"
        disabled={!agreed || loading}
        paddingBottom={insets.bottom + 16}
        onPress={() => setModalVisible(true)}
      />

      <ConfirmModal
        visible={modalVisible}
        title="정말 탈퇴하시겠습니까?"
        description={"탈퇴 후 7일간 동일 계정으로\n재가입이 불가합니다."}
        onCancel={() => setModalVisible(false)}
        onConfirm={handleWithdraw}
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
