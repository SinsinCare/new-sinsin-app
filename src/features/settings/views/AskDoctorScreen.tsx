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
  ScrollView,
  Modal,
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
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"

export function AskDoctorScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const c = useSettingsColors()

  const colorScheme = useAppColorScheme()
  const isDarkMode = colorScheme === "dark"

  const [doctorCode, setPatientCode] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

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

          <Pressable
            onPress={() => setShowTerms(true)}
            style={styles.termsLink}
          >
            <ThemedText style={[styles.termsLinkText, { color: c.textTertiary }]}>
              데이터 공유 약관 보기
            </ThemedText>
            <Ionicons name="chevron-forward" size={14} color={c.textTertiary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <BottomActionBar
        label="등록하기"
        disabled={!canSubmit}
        paddingBottom={insets.bottom + 16}
        onPress={handleSubmit}
      />

      {/* 데이터 공유 약관 모달 */}
      <Modal
        visible={showTerms}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTerms(false)}
      >
        <View style={[styles.termsModal, { backgroundColor: c.bg }]}>
          <View style={styles.termsHeader}>
            <ThemedText style={[styles.termsTitle, { color: c.text }]}>
              데이터 공유 약관
            </ThemedText>
            <Pressable
              onPress={() => setShowTerms(false)}
              hitSlop={8}
            >
              <Ionicons name="close" size={22} color={c.textSub} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.termsScroll}
            contentContainerStyle={styles.termsContent}
          >
            <ThemedText style={[styles.termsSection, { color: c.text }]}>
              의사 등록 및 데이터 공유 약관
            </ThemedText>

            <ThemedText style={[styles.termsParagraph, { color: c.textSub }]}>
              본 약관은 신신당부 앱의 의사 등록 기능을 통한 건강 데이터 공유에 관한
              사항을 규정합니다.
            </ThemedText>

            <ThemedText style={[styles.termsSection, { color: c.text }]}>
              제1조 (서비스 개요)
            </ThemedText>
            <ThemedText style={[styles.termsParagraph, { color: c.textSub }]}>
              의사 등록 기능은 사용자가 담당 의사의 고유 코드를 입력하여 자신의 식단
              기록 데이터를 해당 의사에게 공유하는 기능입니다. 의사는 공유된 데이터를
              열람하고 저장할 수 있습니다.
            </ThemedText>

            <ThemedText style={[styles.termsSection, { color: c.text }]}>
              제2조 (실험 단계 안내)
            </ThemedText>
            <ThemedText style={[styles.termsParagraph, { color: c.textSub }]}>
              본 의사 등록 기능은 현재 실험(베타) 단계로 운영되고 있습니다. 서비스의
              안정성 및 기능이 향후 변경될 수 있으며, 실험 단계 종료 시 별도 안내를
              드립니다.
            </ThemedText>

            <ThemedText style={[styles.termsSection, { color: c.text }]}>
              제3조 (공유되는 데이터)
            </ThemedText>
            <ThemedText style={[styles.termsParagraph, { color: c.textSub }]}>
              동의 시 담당 의사에게 공유되는 데이터는 다음과 같습니다:{"\n"}
              • 일일 식단 기록 (음식 사진, AI 분석 결과){"\n"}
              • 영양소 섭취 기록 (나트륨, 칼륨, 인, 단백질 등){"\n"}
              • 수분 섭취 기록{"\n"}
              • 체중 및 부종 기록
            </ThemedText>

            <ThemedText style={[styles.termsSection, { color: c.text }]}>
              제4조 (데이터 삭제)
            </ThemedText>
            <ThemedText style={[styles.termsParagraph, { color: c.textSub }]}>
              공유된 데이터는 다음의 경우 즉시 삭제됩니다:{"\n\n"}
              1. 회원 탈퇴 시: 사용자가 신신당부 앱에서 회원 탈퇴를 진행할 경우,
              의사에게 공유 및 저장된 모든 데이터가 즉시 삭제됩니다.{"\n\n"}
              2. 사용자 직접 요청 시: 사용자가 데이터 공유 중단 또는 삭제를 직접
              요청하는 경우, 의사에게 공유 및 저장된 모든 데이터가 즉시
              삭제됩니다.{"\n\n"}
              삭제된 데이터는 복구할 수 없으며, 삭제 처리 완료 후 별도 안내를
              드립니다.
            </ThemedText>

            <ThemedText style={[styles.termsSection, { color: c.text }]}>
              제5조 (동의 철회)
            </ThemedText>
            <ThemedText style={[styles.termsParagraph, { color: c.textSub }]}>
              사용자는 언제든지 데이터 공유 동의를 철회할 수 있습니다. 동의 철회 시
              이후 데이터는 더 이상 공유되지 않으며, 기존에 공유 및 저장된 데이터의
              삭제를 요청할 수 있습니다.
            </ThemedText>

            <ThemedText style={[styles.termsSection, { color: c.text }]}>
              제6조 (문의)
            </ThemedText>
            <ThemedText style={[styles.termsParagraph, { color: c.textSub }]}>
              데이터 공유 및 삭제에 관한 문의는 앱 내 '문의하기' 기능 또는
              고객센터를 통해 접수하실 수 있습니다.
            </ThemedText>
          </ScrollView>

          <View style={[styles.termsBottom, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable
              style={styles.termsCloseButton}
              onPress={() => setShowTerms(false)}
            >
              <ThemedText style={styles.termsCloseText}>
                확인
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  termsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 12,
    paddingVertical: 4,
    paddingLeft: 32,
  },
  termsLinkText: {
    fontSize: 13,
    fontWeight: "400",
    textDecorationLine: "underline",
  },
  termsModal: {
    flex: 1,
  },
  termsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  termsTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  termsScroll: {
    flex: 1,
  },
  termsContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  termsSection: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: 20,
    marginBottom: 8,
  },
  termsParagraph: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 22,
  },
  termsBottom: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  termsCloseButton: {
    backgroundColor: "#44AF94",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  termsCloseText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})
