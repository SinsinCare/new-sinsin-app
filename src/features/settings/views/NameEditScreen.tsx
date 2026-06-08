import React, { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { showErrorToast } from "@/src/lib/toast"
import { ApiError } from "@/src/services/core/apiError"
import { api } from "@/src/services/core/apiClient"
import { tokens } from "@/src/theme/tokens"
import { useMyPageProfile } from "../hooks/useMyPageProfile"
import { useSettingsColors } from "../hooks/useSettingsColors"

const NAME_MAX_LENGTH = 20

function getErrorMessage(e: unknown): string | null {
  if (e instanceof ApiError) {
    if (e.isNetworkError) return null
    switch (e.code) {
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

export function NameEditScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: profile } = useMyPageProfile()
  const c = useSettingsColors()

  const [name, setName] = useState(profile?.name ?? "")
  const [isFocused, setIsFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const touchedRef = useRef(false)

  useEffect(() => {
    if (!touchedRef.current && profile?.name) {
      setName(profile.name)
    }
  }, [profile?.name])

  const trimmedName = name.trim()
  const hasText = trimmedName.length > 0
  const isFormatValid = hasText && trimmedName.length <= NAME_MAX_LENGTH
  const hasError = name.length > 0 && (!isFormatValid || !!serverError)

  const validationMessage = serverError
    ? serverError
    : name.length > 0 && !hasText
      ? "이름을 입력해주세요."
      : trimmedName.length > NAME_MAX_LENGTH
        ? `이름은 ${NAME_MAX_LENGTH}자 이내로 입력해주세요.`
        : null

  const handleChangeText = (text: string) => {
    touchedRef.current = true
    setName(text)
    if (serverError) setServerError(null)
  }

  const handleSave = async () => {
    if (!profile || !isFormatValid || isLoading) return
    setIsLoading(true)
    try {
      await api.patch("/user/profile", {
        nickName: profile.nickName,
        name: trimmedName,
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
            이름을 입력해주세요
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: c.textMuted }]}>
            프로필에 표시되는 이름입니다. 언제든지 변경할 수 있습니다.
          </ThemedText>

          <ThemedText style={[styles.inputLabel, { color: c.textSub }]}>
            이름
          </ThemedText>
          <View
            style={[
              styles.inputRow,
              { borderBottomColor: c.border },
              isFocused && styles.inputRowFocused,
              isFormatValid && styles.inputRowValid,
              hasError && styles.inputRowError,
            ]}
          >
            <TextInput
              style={[styles.textInput, { color: c.text }]}
              value={name}
              onChangeText={handleChangeText}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="이름을 입력해주세요"
              placeholderTextColor={c.textTertiary}
              maxLength={NAME_MAX_LENGTH}
              autoFocus
              editable={!isLoading}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            {isLoading ? (
              <ActivityIndicator size="small" color={c.textMuted} />
            ) : (
              name.length > 0 && (
                <Pressable
                  onPress={() => {
                    touchedRef.current = true
                    setName("")
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
            <ThemedText style={[styles.validationText, styles.invalidText]}>
              {validationMessage}
            </ThemedText>
          )}
        </ScrollView>

        <BottomActionBar
          label="저장"
          disabled={!isFormatValid || isLoading || !!serverError}
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
  invalidText: {
    color: tokens.color.restrictionText.val,
  },
})
