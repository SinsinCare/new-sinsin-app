import React, { useState } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter, useLocalSearchParams } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { passwordService } from "@/src/services"

// 영문 대문자, 소문자, 숫자, 특수문자 포함 6~18자
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^a-zA-Z\d\s]).{6,18}$/

export function PasswordEditScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { token } = useLocalSearchParams<{ token?: string }>()

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [confirmFocused, setConfirmFocused] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isPasswordValid = PASSWORD_REGEX.test(password)
  const hasConfirm = confirm.length > 0
  const isMatch = password === confirm
  const canSubmit = isPasswordValid && hasConfirm && isMatch && !isSubmitting

  const confirmMessage = hasConfirm
    ? isMatch
      ? "비밀번호가 일치합니다"
      : "비밀번호가 일치하지 않습니다"
    : null

  const handleSave = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await passwordService.changePassword(password, token)
      if (token) {
        // deeplink 진입: 로그인 화면으로
        router.replace("/(auth)/login")
      } else {
        router.back()
      }
    } catch (e: unknown) {
      setSubmitError(
        e instanceof Error ? e.message : "비밀번호 변경에 실패했습니다.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        {/* 헤더 */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color="#17191C" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText style={styles.title}>
            새 비밀번호를 입력해주세요
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {"영문 대/소문자, 숫자, 특수문자 포함\n6~18자 이내로 입력해주세요"}
          </ThemedText>

          {/* 비밀번호 */}
          <ThemedText style={styles.inputLabel}>비밀번호</ThemedText>
          <View
            style={[
              styles.inputRow,
              passwordFocused && styles.inputRowFocused,
              password.length > 0 && isPasswordValid && styles.inputRowValid,
            ]}
          >
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              placeholder="비밀번호를 형식에 맞춰 입력해주세요"
              placeholderTextColor="#C5C8CE"
              secureTextEntry
              autoFocus
            />
            {password.length > 0 && (
              <Pressable onPress={() => setPassword("")} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color="#C5C8CE" />
              </Pressable>
            )}
          </View>

          {/* 비밀번호 확인 */}
          <ThemedText style={[styles.inputLabel, { marginTop: 32 }]}>
            비밀번호 확인
          </ThemedText>
          <View
            style={[
              styles.inputRow,
              confirmFocused && styles.inputRowFocused,
              hasConfirm && isMatch && styles.inputRowValid,
              hasConfirm && !isMatch && styles.inputRowError,
            ]}
          >
            <TextInput
              style={styles.textInput}
              value={confirm}
              onChangeText={setConfirm}
              onFocus={() => setConfirmFocused(true)}
              onBlur={() => setConfirmFocused(false)}
              placeholder="입력한 비밀번호를 다시 입력해주세요"
              placeholderTextColor="#C5C8CE"
              secureTextEntry
            />
            {confirm.length > 0 && (
              <Pressable onPress={() => setConfirm("")} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color="#C5C8CE" />
              </Pressable>
            )}
          </View>

          {confirmMessage && (
            <ThemedText
              style={[
                styles.validationText,
                isMatch ? styles.validText : styles.invalidText,
              ]}
            >
              {confirmMessage}
            </ThemedText>
          )}


        </ScrollView>

        {submitError && (
          <ThemedText style={styles.errorText}>{submitError}</ThemedText>
        )}
        <BottomActionBar
          label="수정 완료"
          disabled={!canSubmit}
          paddingBottom={insets.bottom + 16}
          onPress={handleSave}
        />
      </KeyboardAvoidingView>
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700",
    color: "#17191C",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    color: "#94A3B8",
    marginBottom: 40,
  },
  inputLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 10,
    gap: 8,
  },
  inputRowFocused: {
    borderBottomColor: "#94A3B8",
  },
  inputRowValid: {
    borderBottomColor: "#44AF94",
  },
  inputRowError: {
    borderBottomColor: "#EF4444",
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    color: "#17191C",
    padding: 0,
  },
  validationText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    marginTop: 8,
  },
  validText: {
    color: "#44AF94",
  },
  invalidText: {
    color: "#EF4444",
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#EF4444",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
})
