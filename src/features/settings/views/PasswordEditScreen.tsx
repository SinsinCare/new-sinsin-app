import React, { useState } from "react"
import { Platform, Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"
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
import { tokenService } from "@/src/services/core/tokenService"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT } from "@/src/theme/surface"
import {
  getPasswordCriteriaState,
  isPasswordValid as validatePassword,
} from "@/src/features/auth/data/passwordValidation"

export function PasswordEditScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
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
      const session = await passwordService.changePassword(
        password,
        token,
        isResetFlow ? undefined : currentPassword,
      )
      if (token) {
        // deeplink 진입: 로그인 화면으로
        router.replace("/(auth)/login")
        return
      }
      /*
        서버는 바꾸는 순간 이 계정의 리프레시 토큰을 전부 지우고(다른 기기의 침입자
        세션까지) **이 세션 몫만 새로 발급**해 돌려준다. 받아 넣지 않으면 액세스 토큰이
        만료되는 한 시간 뒤 조용히 로그아웃된다 — "바꿨더니 나중에 튕긴다" 의 원인.
        들려 있던 방식(영속/임시)은 그대로 — 사용자가 고른 "로그인 유지" 를 여기서
        뒤집지 않는다.
      */
      if (session !== null) {
        await tokenService.setTokens(
          session.accessToken,
          session.refreshToken,
          await tokenService.getPersistence(),
        )
      }
      router.back()
    } catch (e: unknown) {
      /*
        서버 코드로 가른다 — 상태 코드로 가르면 틀린다. 현재 비밀번호 불일치는
        `LOGIN_ERROR_001`(401 — 세션 만료가 아니다, `apiClient` 의 401 가드 주석),
        새 비밀번호가 현재 것과 같으면 `COMMON_ERROR_001`(400). 예전에는 400·403 을
        전부 "현재 비밀번호가 틀렸다" 로 읽어서 같은 비밀번호를 넣은 사람이 현재
        비밀번호를 의심했다. 나머지는 서버 문장이 말하게 둔다(만료된 재설정 링크 등).
      */
      const code = e instanceof ApiError ? e.code : null
      setSubmitError(
        !isResetFlow && code === "LOGIN_ERROR_001"
          ? t("password.wrongCurrent")
          : !isResetFlow && code === "COMMON_ERROR_001"
            ? t("password.sameAsCurrent")
            : getErrorMessage(e),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  /*
    **흰 페이지다.** 전에는 `appBg`(라이트 #eaeaec = 화면 바닥/우물)였는데, 그 값은
    `SettingsTextField` 의 입력 면과 **같은 토큰**이라 필드가 바닥에 녹아 사라졌다
    (라이트 ΔL* 7.25 → 0.00). 근거와 다른 선택지는 그 컴포넌트 머리말 §우물.
    `canvas` 는 다크에서 `appBgDark`(#1f1f21)와 같은 값이라 다크는 안 움직인다.
  */
  const pageBg = s.canvas

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
      <View style={styles.flex}>
        {/* 헤더 */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("shared.back")}
            /* 비밀번호 재설정은 `https://sinsincare.kr/password-edit` 딥링크로도
               들어온다 — 그때는 히스토리가 없고, `back()` 이 라우트 그래프가 정한
               프로필 수정으로 대신 나간다. */
            onPress={router.back}
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
          <Text
            style={[styles.submitError, { color: s.danger }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {submitError}
          </Text>
        )}
        <BottomActionBar
          label={t("password.submit")}
          disabled={!canSubmit}
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
