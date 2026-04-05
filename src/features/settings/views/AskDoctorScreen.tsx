import React, { useState, useRef } from "react"
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  useColorScheme,
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
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import { tokens } from "@/src/theme/tokens"

export function AskDoctorScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const c = useSettingsColors()

  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"

  const [doctorCode, setPatientCode] = useState("")
  const [agreed, setAgreed] = useState(false)

  const inputRef = useRef<TextInput>(null)

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

  const handleBoxPress = () => {
    inputRef.current?.focus()
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
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
          {/* 의사용 화면의 카드 디자인을 반영한 입력 영역 */}
          <View style={[styles.mainCard, { backgroundColor: isDarkMode ? tokens.color.cardBgDark.val : "#EEFAF7" }]}>
            <ThemedText style={[styles.cardTitle, { color: tokens.color.sub7.val }]}>
              신신당부 앱 등록
            </ThemedText>

            <Pressable style={styles.otpContainer} onPress={handleBoxPress}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.otpBox,
                    { backgroundColor: isDarkMode ? tokens.color.grey2.val : "#FFFFFF" },
                    doctorCode.length === i && styles.otpBoxActive,
                  ]}
                >
                  <ThemedText 
                    style={[
                      styles.otpText, 
                      { color: doctorCode[i] ? tokens.color.sub8.val : c.textTertiary }
                    ]}
                  >
                    {doctorCode[i] || ""}
                  </ThemedText>
                </View>
              ))}
            </Pressable>

            <ThemedText style={[styles.cardSubText, { color: c.textTertiary }]}>
              병원에서 전달받은 6자리 코드를 입력해주세요
            </ThemedText>
          </View>

          {/* 실제 입력을 받는 숨겨진 필드 */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={doctorCode}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, "").slice(0, 6)
              setPatientCode(cleaned)
              if (cleaned.length === 6) Keyboard.dismiss()
            }}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          <View style={styles.agreementSection}>
            {/* 동의 체크박스 */}
            <Pressable
              style={styles.checkboxRow}
              onPress={() => setAgreed((prev) => !prev)}
            >
              <Ionicons
                name={agreed ? "checkbox" : "square-outline"}
                size={22}
                color={agreed ? tokens.color.sub6.val : c.textTertiary}
              />
              <ThemedText style={[styles.checkboxText, { color: c.text }]}>
                담당 의사에게 건강 데이터 열람 및 공유를 동의합니다
              </ThemedText>
            </Pressable>
            
            <ThemedText style={[styles.infoLabel, { color: c.textTertiary }]}>
              * 동의 시 의사가 환자님의 건강 기록을 모니터링할 수 있습니다.
            </ThemedText>
          </View>
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
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  mainCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "rgba(91, 197, 171, 0.2)",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 20,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  otpBox: {
    width: 42,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
    ...Platform.select({
      ios: {
        shadowColor: tokens.color.textLight.val,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  otpBoxActive: {
    borderColor: tokens.color.sub6.val,
    borderWidth: 1.5,
  },
  otpText: {
    fontSize: 24,
    fontWeight: "800",
  },
  cardSubText: {
    fontSize: 13,
    fontWeight: "500",
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  agreementSection: {
    paddingHorizontal: 4,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  checkboxText: {
    fontSize: 15,
    fontWeight: "500",
  },
  infoLabel: {
    fontSize: 12,
    paddingLeft: 32,
    lineHeight: 18,
  },
})
