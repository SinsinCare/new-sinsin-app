import React, { useEffect, useRef, useState } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { api } from "@/src/services/core/apiClient"
import { ApiError } from "@/src/services/core/apiError"
import { useMyPageProfile } from "@/src/features/settings/hooks/useMyPageProfile"
import { showErrorToast } from "@/src/lib/toast"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import { tokens } from "@/src/theme/tokens"

const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9]{2,14}$/

function getErrorMessage(e: unknown): string | null {
  if (e instanceof ApiError) {
    if (e.isNetworkError) return null // toast로 처리
    switch (e.code) {
      case "SIGNUP_ERROR_003":
        return "이미 사용 중인 닉네임입니다."
      case "TOKEN_ERROR_001":
        return "인증 토큰이 유효하지 않습니다. 다시 로그인해주세요."
      case "ONBOARDING_ERROR_002":
        return "잘못된 값이 입력되었습니다."
      default:
        return e.message || "저장 중 오류가 발생했습니다."
    }
  }
  return "저장 중 오류가 발생했습니다."
}

export function NicknameEditScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: profile } = useMyPageProfile()
  const c = useSettingsColors()

  const [nickname, setNickname] = useState(profile?.nickName ?? "")
  const [isFocused, setIsFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const touchedRef = useRef(false)

  useEffect(() => {
    if (!touchedRef.current && profile?.nickName) {
      setNickname(profile.nickName)
    }
  }, [profile?.nickName])

  const hasText = nickname.length > 0
  const isFormatValid = NICKNAME_REGEX.test(nickname)
  const hasError = hasText && (!isFormatValid || !!serverError)
  const hasSuccess = hasText && isFormatValid && !serverError

  const validationMessage = hasText
    ? serverError
      ? serverError
      : isFormatValid
        ? "사용 가능한 닉네임입니다"
        : "규칙에 맞는 닉네임을 입력해주세요"
    : null

  const handleChangeText = (text: string) => {
    touchedRef.current = true
    setNickname(text)
    if (serverError) setServerError(null)
  }

  const handleSave = async () => {
    if (!profile || !isFormatValid || isLoading) return
    setIsLoading(true)
    try {
      await api.patch("/user/profile", {
        nickName: nickname,
        name: profile.name,
        gender: profile.gender ?? null,
      })
      await queryClient.invalidateQueries({ queryKey: ["myPageProfile"] })
      router.back()
    } catch (e) {
      if (e instanceof ApiError && e.isNetworkError) {
        showErrorToast(e.message)
        return
      }
      setServerError(getErrorMessage(e))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        {/* 헤더: 뒤로가기만 */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={c.text} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText style={[styles.title, { color: c.text }]}>
            {"앞으로 신신당부에서\n어떻게 불러드리면 좋을까요?"}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: c.textMuted }]}>
            {
              "한글, 영문, 숫자만 가능합니다 (2~14자 이내)\n닉네임은 언제든지 변경할 수 있습니다"
            }
          </ThemedText>

          <ThemedText style={[styles.inputLabel, { color: c.textSub }]}>
            닉네임
          </ThemedText>
          <View
            style={[
              styles.inputRow,
              { borderBottomColor: c.border },
              isFocused && styles.inputRowFocused,
              hasSuccess && styles.inputRowValid,
              hasError && styles.inputRowError,
            ]}
          >
            <TextInput
              style={[styles.textInput, { color: c.text }]}
              value={nickname}
              onChangeText={handleChangeText}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="별명을 적어주세요. 어떤 것이든 괜찮아요!"
              placeholderTextColor={c.textTertiary}
              maxLength={14}
              autoFocus
              editable={!isLoading}
            />
            {isLoading ? (
              <ActivityIndicator size="small" color={c.textMuted} />
            ) : (
              hasText && (
                <Pressable
                  onPress={() => {
                    touchedRef.current = true
                    setNickname("")
                    setServerError(null)
                  }}
                  hitSlop={8}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={c.textTertiary}
                  />
                </Pressable>
              )
            )}
          </View>

          {validationMessage && (
            <ThemedText
              style={[
                styles.validationText,
                hasSuccess ? styles.validText : styles.invalidText,
              ]}
            >
              {validationMessage}
            </ThemedText>
          )}
        </ScrollView>

        <BottomActionBar
          label="저장"
          disabled={!profile || !isFormatValid || isLoading || !!serverError}
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
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    marginBottom: 40,
  },
  inputLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1.5,
    paddingBottom: 10,
    gap: 8,
  },
  inputRowFocused: {
    borderBottomColor: "#94A3B8",
  },
  inputRowValid: {
    borderBottomColor: tokens.color.sub6.val,
  },
  inputRowError: {
    borderBottomColor: tokens.color.restrictionText.val,
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    padding: 0,
  },
  validationText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    marginTop: 8,
  },
  validText: {
    color: tokens.color.sub6.val,
  },
  invalidText: {
    color: tokens.color.restrictionText.val,
  },
})
