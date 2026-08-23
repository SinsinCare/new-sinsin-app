import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { StyleSheet, View } from "react-native"
import { useAuth } from "@/src/hooks/useAuth"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { showErrorToast } from "@/src/lib/toast"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import {
  PasswordCriteriaText,
  StepHelperText,
  StepTextInput,
} from "../components"
import {
  PASSWORD_FIELD_ORDER,
  getConfirmPasswordRules,
  getPasswordRules,
} from "../data/passwordValidation"
import { trackFormValidationFailed } from "@/src/shared/utils/formValidationState"
import { AUTH_LAYOUT } from "../data/authSurface"
import { getDestinationForAccountState } from "../utils/accountStateRoute"
import { AuthScreenLayout } from "./AuthScreenLayout"
import type { PasswordForm } from "../types"

export function EmailLoginLinkPasswordScreen() {
  const { t } = useTranslation("auth")
  const { email, emailLinkToken } = useLocalSearchParams<{
    email?: string
    emailLinkToken?: string
  }>()
  const { completeEmailLoginLink } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  const { control, handleSubmit, watch, setError } = useForm<PasswordForm>({
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  })

  const password = watch("password")
  const tokenValue =
    typeof emailLinkToken === "string" && emailLinkToken.length > 0
      ? emailLinkToken
      : null
  const emailValue = typeof email === "string" ? email : null

  useEffect(() => {
    if (!tokenValue) {
      showErrorToast(t("linkPassword.expired"))
      router.replace("/(auth)/signup-email")
    }
  }, [t, tokenValue])

  const submit = async (data: PasswordForm) => {
    if (!tokenValue || submitting) return
    setSubmitting(true)
    try {
      const result = await completeEmailLoginLink(tokenValue, data.password)
      /* 반대 방향의 연결(`social-link-email`)과 **같은 이름**으로 센다. 화면명이 둘 다
         `account_link` 로 접혀 있어 화면 축으로는 방향이 안 갈리므로, 방향은 `mode` 가
         진다. 실패(대부분 만료된 연결 토큰 `TOKEN_ERROR_005`)는 폼 필드 아래로 나가고
         `app_error_presented` 와 나란히 읽는다. */
      trackAnalyticsEvent("auth_account_link_completed", {
        mode: "email_password",
      })
      router.replace(
        getDestinationForAccountState(
          result.accountState,
          result.requiresAdditionalInfo,
          result.entryGate,
        ),
      )
    } catch (error) {
      // 연결 토큰 만료(`TOKEN_ERROR_005`)가 여기서 가장 흔하다. 폴백으로 덮으면
      // "잠시 후 다시" 를 권하게 되는데, 이 실패는 기다릴수록 더 안 된다.
      setError("password", { message: getErrorMessage(error) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthScreenLayout
      title={t("linkPassword.title")}
      subtitle={
        emailValue
          ? t("linkPassword.subtitleWithEmail", { email: emailValue })
          : t("linkPassword.subtitle")
      }
      buttonLabel={t("linkPassword.connect")}
      buttonDisabled={submitting}
      buttonLoading={submitting}
      onSubmit={handleSubmit(submit, (errors) =>
        trackFormValidationFailed(
          "account_link_password",
          PASSWORD_FIELD_ORDER,
          errors,
        ),
      )}
      keyboardAvoiding
    >
      <View style={styles.body}>
        <Controller
          name="password"
          control={control}
          rules={getPasswordRules()}
          render={({ field, fieldState }) => (
            <View style={styles.group}>
              <StepTextInput
                autoFocus
                label={t("fields.password")}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder={t("password.placeholder")}
                secureTextEntry
                textContentType="newPassword"
                autoComplete="new-password"
                returnKeyType="next"
                hasError={!!fieldState.error}
              />
              {fieldState.error?.message ? (
                <StepHelperText
                  message={fieldState.error.message}
                  tone="error"
                />
              ) : (
                <PasswordCriteriaText password={field.value} />
              )}
            </View>
          )}
        />

        <Controller
          name="confirmPassword"
          control={control}
          rules={getConfirmPasswordRules(password)}
          render={({ field, fieldState }) => (
            <View>
              <StepTextInput
                label={t("fields.confirmPassword")}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder={t("password.confirmPlaceholder")}
                secureTextEntry
                textContentType="newPassword"
                autoComplete="new-password"
                returnKeyType="done"
                hasError={!!fieldState.error}
              />
              {fieldState.error?.message ? (
                <StepHelperText
                  message={fieldState.error.message}
                  tone="error"
                />
              ) : null}
            </View>
          )}
        />
      </View>
    </AuthScreenLayout>
  )
}

const styles = StyleSheet.create({
  body: { marginTop: AUTH_LAYOUT.questionToField, gap: 20 },
  group: { gap: 10 },
})
