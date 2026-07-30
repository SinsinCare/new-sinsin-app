import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { StyleSheet, View } from "react-native"
import { useAuth } from "@/src/hooks/useAuth"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { showErrorToast } from "@/src/lib/toast"
import {
  PasswordCriteriaText,
  StepHelperText,
  StepTextInput,
} from "../components"
import {
  getConfirmPasswordRules,
  getPasswordRules,
} from "../data/passwordValidation"
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
      router.replace(
        getDestinationForAccountState(
          result.accountState,
          result.requiresAdditionalInfo,
          result.entryGate,
        ),
      )
    } catch (error) {
      setError("password", {
        message: getErrorMessage(error, t("linkPassword.failed")),
      })
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
      onSubmit={handleSubmit(submit)}
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
