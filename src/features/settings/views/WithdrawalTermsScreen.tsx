import React, { useState } from "react"
import { StyleSheet, View, ScrollView, Pressable } from "react-native"
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

export function WithdrawalTermsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [agreed, setAgreed] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)

  const handleWithdraw = async () => {
    setModalVisible(false)
    // TODO: 탈퇴 API 호출
    router.push("/(settings)/withdrawal-complete")
  }

  return (
    <ThemedView style={styles.container}>
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
          <Ionicons name="chevron-back" size={24} color="#17191C" />
        </Pressable>

        <ThemedText style={styles.title}>
          {"신신당부를 떠나기 전에\n꼭 확인해주세요"}
        </ThemedText>

        <DotItem text={WITHDRAWAL_NOTICE} />

        <ThemedText style={styles.sectionTitle}>탈퇴 약관</ThemedText>
        <View style={styles.termsList}>
          {WITHDRAWAL_TERMS.map((term, i) => (
            <DotItem key={i} text={term} />
          ))}
        </View>

        <Pressable
          style={styles.agreementBox}
          onPress={() => setAgreed((v) => !v)}
        >
          <Ionicons
            name={agreed ? "checkbox" : "square-outline"}
            size={20}
            color={agreed ? "#17191C" : "#666677"}
          />
          <ThemedText
            style={[
              styles.agreementText,
              agreed && styles.agreementTextChecked,
            ]}
          >
            유의사항 숙지 후 탈퇴에 동의합니다.
          </ThemedText>
        </Pressable>
      </ScrollView>

      <BottomActionBar
        label="탈퇴하기"
        disabled={!agreed}
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
    backgroundColor: "#FFFFFF",
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
    color: "#17191C",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    color: "#17191C",
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
    backgroundColor: "#F6F7FA",
  },
  agreementText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    color: "#666677",
  },
  agreementTextChecked: {
    color: "#17191C",
  },
})
