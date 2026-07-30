import React, { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import { ThemedView } from "@/components/themed-view"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { showErrorToast } from "@/src/lib/toast"
import { getErrorMessage as getUserFacingErrorMessage } from "@/src/lib/errorUtils"
import { ApiError } from "@/src/services/core/apiError"
import { api } from "@/src/services/core/apiClient"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT } from "@/src/theme/surface"
import { tokens } from "@/src/theme/tokens"
import i18n from "@/src/i18n"
import { FieldHelp, SettingsTextField } from "../components/SettingsTextField"
import { useMyPageProfile } from "../hooks/useMyPageProfile"

const NAME_MAX_LENGTH = 20

function getNameErrorMessage(e: unknown): string | null {
  if (e instanceof ApiError) {
    if (e.isNetworkError) return null
    switch (e.code) {
      case "TOKEN_ERROR_001":
        return i18n.t("name.error.sessionExpired", { ns: "settings" })
      case "ONBOARDING_ERROR_002":
        return i18n.t("name.check", { ns: "settings" })
      default:
        return i18n.t("name.error.save", { ns: "settings" })
    }
  }
  return i18n.t("name.error.save", { ns: "settings" })
}

export function NameEditScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: profile } = useMyPageProfile()
  const s = useSurface()
  const { t } = useTranslation("settings")

  const [name, setName] = useState(profile?.name ?? "")
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
      ? t("name.required")
      : trimmedName.length > NAME_MAX_LENGTH
        ? t("name.tooLong", { max: NAME_MAX_LENGTH })
        : null

  const handleChangeText = (text: string) => {
    touchedRef.current = true
    setName(text)
    if (serverError) setServerError(null)
  }

  const handleClear = () => {
    touchedRef.current = true
    setName("")
    setServerError(null)
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
        showErrorToast(getUserFacingErrorMessage(e))
        return
      }
      setServerError(getNameErrorMessage(e))
    } finally {
      setIsLoading(false)
    }
  }

  const pageBg = s.isDark ? tokens.color.appBgDark.val : tokens.color.appBg.val

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("shared.back")}
            // 딥링크로 첫 화면이 되면 히스토리가 없다 — back 대신 프로필 수정으로.
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(settings)/profile-edit")
            }
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={24} color={s.textStrong} />
          </Pressable>
        </View>

        <ScrollView
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={[styles.title, { color: s.textStrong }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("name.title")}
          </Text>
          <Text
            style={[styles.subtitle, { color: s.textMuted }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("name.subtitle")}
          </Text>

          <SettingsTextField
            label={t("name.field")}
            value={name}
            onChangeText={handleChangeText}
            placeholder={t("name.field")}
            maxLength={NAME_MAX_LENGTH}
            autoFocus
            editable={!isLoading}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleSave}
            hasError={hasError}
            // 저장 중에는 지우기 대신 진행 표시가 그 자리에 선다.
            onClear={isLoading ? undefined : handleClear}
            trailing={
              isLoading ? (
                <ActivityIndicator size="small" color={s.textMuted} />
              ) : undefined
            }
          />

          {validationMessage && (
            <FieldHelp text={validationMessage} tone="error" />
          )}
        </ScrollView>

        <BottomActionBar
          label={t("shared.save")}
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
    paddingHorizontal: LAYOUT.screenX,
    paddingBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenX,
    paddingTop: 12,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.48,
    fontWeight: "700",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    marginBottom: 36,
  },
})
