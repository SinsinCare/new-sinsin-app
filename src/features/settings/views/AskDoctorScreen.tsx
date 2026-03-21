import React, { useState } from "react"
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useMutation } from "@tanstack/react-query"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { enrollDoctor } from "@/src/services/doctorService"

export function AskDoctorScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [doctorCode, setPatientCode] = useState("")
  const [agreed, setAgreed] = useState(false)

  const { mutate, isPending } = useMutation({
    mutationFn: enrollDoctor,
    onSuccess: () => {
      Alert.alert("등록 완료", "담당의사가 등록되었습니다.", [
        { text: "확인", onPress: () => router.back() },
      ])
    },
    onError: (error) => {
      Alert.alert(
        "등록 실패",
        error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.",
      )
    },
  })

  const canSubmit = doctorCode.length === 6 && agreed && !isPending

  const handleSubmit = () => {
    mutate(doctorCode)
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title="의사 연결하기"
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View style={styles.content}>
          {/* 환자 코드 입력 */}
          <ThemedText style={styles.fieldLabel}>의사 코드</ThemedText>
          <TextInput
            style={styles.codeInput}
            value={doctorCode}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, "").slice(0, 6)
              setPatientCode(cleaned)
              if (cleaned.length === 6) Keyboard.dismiss()
            }}
            placeholder="6자리 코드를 입력해주세요"
            placeholderTextColor="#C5C8CE"
            keyboardType="number-pad"
            maxLength={6}
          />

          <View style={styles.divider} />

          {/* 동의 체크박스 */}
          <Pressable
            style={styles.checkboxRow}
            onPress={() => setAgreed((prev) => !prev)}
          >
            <Ionicons
              name={agreed ? "checkbox" : "square-outline"}
              size={22}
              color={agreed ? "#44AF94" : "#C5C8CE"}
            />
            <ThemedText style={styles.checkboxText}>
              담당 의사에게 건강 데이터 열람 및 공유를 동의합니다
            </ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <BottomActionBar
        label="등록하기"
        disabled={!canSubmit}
        paddingBottom={insets.bottom + 16}
        onPress={handleSubmit}
      />
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  fieldLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 10,
  },
  codeInput: {
    fontSize: 16,
    lineHeight: 22,
    color: "#17191C",
    paddingVertical: 12,
    padding: 0,
    letterSpacing: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F2F5",
    marginHorizontal: -20,
    marginVertical: 16,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  checkboxText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    color: "#374151",
  },
})
