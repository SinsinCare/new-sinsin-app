import React, { useState } from "react"
import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter, useLocalSearchParams } from "expo-router"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useTranslation } from "react-i18next"

import { ThemedView } from "@/components/themed-view"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import {
  FieldHelp,
  SettingsTextField,
} from "@/src/features/settings/components/SettingsTextField"
import { passwordService } from "@/src/services"
import { ApiError } from "@/src/services/core/apiError"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT } from "@/src/theme/surface"
import { tokens } from "@/src/theme/tokens"
import {
  getPasswordCriteriaState,
  isPasswordValid as validatePassword,
} from "@/src/features/auth/data/passwordValidation"

export function PasswordEditScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { token } = useLocalSearchParams<{ token?: string }>()
  const s = useSurface()
  const { t } = useTranslation("settings")

  const [currentPassword, setCurrentPassword] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isResetFlow = Boolean(token)
  const isCurrentPasswordValid = isResetFlow || currentPassword.length > 0
  const isPasswordValid = validatePassword(password)
  const passwordCriteriaState = getPasswordCriteriaState(password)
  const passwordCriteriaTone =
    passwordCriteriaState === "valid"
      ? "valid"
      : passwordCriteriaState === "invalid"
        ? "error"
        : "muted"
  const hasConfirm = confirm.length > 0
  const isMatch = password === confirm
  const canSubmit =
    isCurrentPasswordValid &&
    isPasswordValid &&
    hasConfirm &&
    isMatch &&
    !isSubmitting

  const confirmMessage = hasConfirm
    ? isMatch
      ? t("password.match")
      : t("password.mismatch")
    : null

  const handleSave = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await passwordService.changePassword(
        password,
        token,
        isResetFlow ? undefined : currentPassword,
      )
      if (token) {
        // deeplink 진입: 로그인 화면으로
        router.replace("/(auth)/login")
      } else {
        router.back()
      }
    } catch (e: unknown) {
      setSubmitError(
        !isResetFlow &&
          e instanceof ApiError &&
          (e.statusCode === 400 || e.statusCode === 403)
          ? t("password.wrongCurrent")
          : getErrorMessage(e, t("password.saveError")),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const pageBg = s.isDark ? tokens.color.appBgDark.val : tokens.color.appBg.val

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
      <View style={styles.flex}>
        {/* 헤더 */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("shared.back")}
            // 비밀번호 재설정 딥링크로 들어오면 히스토리가 없다 — back 대신 프로필 수정으로.
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

        <KeyboardAwareScrollView
          bounces={false}
          overScrollMode="never"
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          bottomOffset={insets.bottom + 88}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
        >
          <Text
            style={[styles.title, { color: s.textStrong }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("password.title")}
          </Text>
          <Text
            style={[styles.subtitle, { color: s.textMuted }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("password.subtitle")}
          </Text>

          {/* 세 필드는 각자 회색 면이 경계다 — 따로 카드로 감싸지 않는다. */}
          <View style={styles.fields}>
            {!isResetFlow && (
              <SettingsTextField
                label={t("password.current")}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder={t("password.current")}
                secureTextEntry
                autoFocus
              />
            )}

            <View>
              <SettingsTextField
                label={t("password.new")}
                value={password}
                onChangeText={setPassword}
                placeholder={t("password.new")}
                secureTextEntry
                autoFocus={isResetFlow}
                hasError={passwordCriteriaState === "invalid"}
              />
              <FieldHelp
                text={t("password.criteria")}
                tone={passwordCriteriaTone}
              />
            </View>

            <View>
              <SettingsTextField
                label={t("password.confirm")}
                value={confirm}
                onChangeText={setConfirm}
                placeholder={t("password.confirmPlaceholder")}
                secureTextEntry
                hasError={hasConfirm && !isMatch}
              />
              {confirmMessage && (
                <FieldHelp
                  text={confirmMessage}
                  tone={isMatch ? "valid" : "error"}
                />
              )}
            </View>
          </View>
        </KeyboardAwareScrollView>

        {submitError && (
          <Text style={[styles.submitError, { color: s.danger }]}>
            {submitError}
          </Text>
        )}
        <BottomActionBar
          label={t("password.submit")}
          disabled={!canSubmit}
          paddingBottom={insets.bottom + 16}
          onPress={handleSave}
        />
      </View>
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
  fields: {
    gap: 24,
  },
  submitError: {
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.26,
    paddingHorizontal: LAYOUT.screenX,
    paddingBottom: 8,
  },
})
