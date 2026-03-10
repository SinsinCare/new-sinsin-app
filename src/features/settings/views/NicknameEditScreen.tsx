import React, { useState } from "react"
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
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { useUserStore } from "@/src/stores/userStore"
import { nicknameService } from "@/src/services/auth/nicknameService"

const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9]{2,8}$/

export function NicknameEditScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const profile = useUserStore((s) => s.profile)

  const [nickname, setNickname] = useState(profile?.nickname ?? "")
  const [isFocused, setIsFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

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
    setNickname(text)
    if (serverError) setServerError(null)
  }

  const handleSave = async () => {
    if (!isFormatValid || isLoading) return
    setIsLoading(true)
    try {
      const available =
        await nicknameService.checkNicknameAvailability(nickname)
      if (!available) {
        setServerError("이미 사용 중인 닉네임입니다")
        return
      }
      // TODO: userStore 업데이트
      router.back()
    } catch {
      setServerError("닉네임 확인 중 오류가 발생했습니다")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        {/* 헤더: 뒤로가기만 */}
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
            {"앞으로 신신당부에서\n어떻게 불러드리면 좋을까요?"}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {
              "한글, 영문, 숫자만 가능합니다 (2~8자 이내)\n닉네임은 언제든지 변경할 수 있습니다"
            }
          </ThemedText>

          <ThemedText style={styles.inputLabel}>닉네임</ThemedText>
          <View
            style={[
              styles.inputRow,
              isFocused && styles.inputRowFocused,
              hasSuccess && styles.inputRowValid,
              hasError && styles.inputRowError,
            ]}
          >
            <TextInput
              style={styles.textInput}
              value={nickname}
              onChangeText={handleChangeText}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="별명을 적어주세요. 어떤 것이든 괜찮아요!"
              placeholderTextColor="#C5C8CE"
              maxLength={8}
              autoFocus
              editable={!isLoading}
            />
            {isLoading ? (
              <ActivityIndicator size="small" color="#94A3B8" />
            ) : (
              hasText && (
                <Pressable
                  onPress={() => {
                    setNickname("")
                    setServerError(null)
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={20} color="#C5C8CE" />
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
})
