import { StyleSheet, View } from "react-native"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { AuthScreenLayout } from "./AuthScreenLayout"
import {
  PasswordCriteriaText,
  StepHelperText,
  StepTextInput,
} from "../components"
import { useSignupPassword } from "../hooks"
import {
  getConfirmPasswordRules,
  getPasswordRules,
} from "../data/passwordValidation"
import { AUTH_LAYOUT } from "../data/authSurface"
import type { PasswordForm } from "../types"

export function SignupPasswordScreen() {
  const { t } = useTranslation("auth")
  const { handleNext } = useSignupPassword()

  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid },
  } = useForm<PasswordForm>({
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange",
  })

  const password = watch("password")

  return (
    <AuthScreenLayout
      title={t("password.createTitle")}
      subtitle={t("password.createSubtitle")}
      buttonLabel={t("common.next")}
      buttonDisabled={!isValid}
      onSubmit={handleSubmit(handleNext)}
      keyboardAvoiding
    >
      <View style={styles.body}>
        <Controller
          name="password"
          control={control}
          rules={getPasswordRules()}
          render={({ field }) => (
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
              />
              <PasswordCriteriaText password={field.value} />
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
                hasError={!!fieldState.error && !!field.value}
              />
              {fieldState.error && field.value ? (
                <StepHelperText
                  message={fieldState.error.message ?? ""}
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
