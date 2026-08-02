import React, { useEffect, useRef, useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppRouter } from "@/src/shared/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ThemedView } from "@/components/themed-view"
import { V2DotLoader } from "@/src/design-system-v2"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import {
  FieldHelp,
  SettingsTextField,
} from "@/src/features/settings/components/SettingsTextField"
import { api } from "@/src/services/core/apiClient"
import { ApiError } from "@/src/services/core/apiError"
import { useMyPageProfile } from "@/src/features/settings/hooks/useMyPageProfile"
import { showErrorToast } from "@/src/lib/toast"
import { getErrorMessage as getUserFacingErrorMessage } from "@/src/lib/errorUtils"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT } from "@/src/theme/surface"
import { tokens } from "@/src/theme/tokens"
import i18n from "@/src/i18n"

const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9]{2,14}$/

function getNicknameErrorMessage(e: unknown): string | null {
  if (e instanceof ApiError) {
    if (e.isNetworkError) return null // toast로 처리
    switch (e.code) {
      case "SIGNUP_ERROR_003":
        return i18n.t("nickname.error.duplicate", { ns: "settings" })
      case "TOKEN_ERROR_001":
        return i18n.t("nickname.error.sessionExpired", { ns: "settings" })
      case "ONBOARDING_ERROR_002":
        return i18n.t("nickname.validation", { ns: "settings" })
      default:
        return i18n.t("nickname.error.save", { ns: "settings" })
    }
  }
  return i18n.t("nickname.error.save", { ns: "settings" })
}

export function NicknameEditScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const queryClient = useQueryClient()
  const { data: profile } = useMyPageProfile()
  const s = useSurface()
  const { t } = useTranslation("settings")

  const [nickname, setNickname] = useState(profile?.nickName ?? "")
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
        ? t("nickname.available")
        : t("nickname.validation")
    : null

  const handleChangeText = (text: string) => {
    touchedRef.current = true
    setNickname(text)
    if (serverError) setServerError(null)
  }

  const handleClear = () => {
    touchedRef.current = true
    setNickname("")
    setServerError(null)
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
        showErrorToast(getUserFacingErrorMessage(e))
        return
      }
      setServerError(getNicknameErrorMessage(e))
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
        {/* 헤더: 뒤로가기만 */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("shared.back")}
            onPress={router.back}
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
            {t("nickname.title")}
          </Text>
          <Text
            style={[styles.subtitle, { color: s.textMuted }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("nickname.subtitle")}
          </Text>

          <SettingsTextField
            label={t("nickname.field")}
            value={nickname}
            onChangeText={handleChangeText}
            placeholder={t("nickname.field")}
            maxLength={14}
            autoFocus
            editable={!isLoading}
            hasError={hasError}
            // 저장 중에는 지우기 대신 진행 표시가 그 자리에 선다.
            onClear={isLoading ? undefined : handleClear}
            trailing={
              isLoading ? (
                <V2DotLoader size="s" color={s.textMuted} />
              ) : undefined
            }
          />

          {validationMessage && (
            <FieldHelp
              text={validationMessage}
              tone={hasSuccess ? "valid" : "error"}
            />
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
