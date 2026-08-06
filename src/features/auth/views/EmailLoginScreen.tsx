import { Pressable, StyleSheet, Text, View } from "react-native"
import { router } from "expo-router"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { ConfirmModal } from "@/src/shared/components"
import { AuthScreenLayout } from "./AuthScreenLayout"
import { StepTextInput, StepHelperText } from "../components"
import { useEmailLogin } from "../hooks"
import { useAuthSurface } from "../hooks/useAuthSurface"
import { AUTH_TYPE } from "../data/authSurface"
import type { LoginForm } from "../types"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 이메일 로그인. 가입 스텝과 같은 규격을 쓴다 — 라벨 13/18, 필드 h56 r14(포커스 시
 * 보더·라벨이 프라이머리로), CTA h56 r16.
 *
 * 두 필드를 36px 씩 벌려 두던 걸 20px 로 좁혔다. 한 덩어리로 읽혀야 할 입력이
 * 서로 다른 블록처럼 떨어져 있었다.
 */
export function EmailLoginScreen() {
  const { t } = useTranslation("auth")
  const {
    isLoading,
    loginError,
    withdrawalPending,
    isCancellingWithdrawal,
    clearLoginError,
    dismissWithdrawalPending,
    confirmWithdrawalCancel,
    submitLogin,
  } = useEmailLogin()
  const surface = useAuthSurface()

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<LoginForm>({
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  })

  const onSubmit = async (data: LoginForm) => {
    await submitLogin(data)
  }

  return (
    <AuthScreenLayout
      title={t("login.title")}
      buttonLabel={t("login.button")}
      buttonDisabled={!isValid}
      buttonLoading={isLoading}
      buttonAccessory={
        <View style={styles.signupRow}>
          <Text
            style={[styles.signupHint, { color: surface.textWeak }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("login.newHere")}
          </Text>
          <Pressable
            onPress={() => router.push("/(auth)/terms-agreement")}
            hitSlop={10}
            accessibilityRole="button"
          >
            <Text style={[styles.signupLink, { color: surface.textStrong }]}>
              {t("login.signUp")}
            </Text>
          </Pressable>
        </View>
      }
      onSubmit={handleSubmit(onSubmit)}
    >
      <ConfirmModal
        visible={!!withdrawalPending}
        title={t("withdrawal.pendingTitle")}
        description={t("withdrawal.pendingDescription")}
        cancelText={t("withdrawal.cancel")}
        confirmText={
          isCancellingWithdrawal
            ? t("withdrawal.cancelling")
            : t("withdrawal.cancelAndLogin")
        }
        onCancel={dismissWithdrawalPending}
        onConfirm={confirmWithdrawalCancel}
      />

      <View style={styles.form}>
        <Controller
          name="email"
          control={control}
          rules={{
            required: t("validation.emailRequired"),
            pattern: {
              value: EMAIL_PATTERN,
              message: t("validation.emailInvalid"),
            },
          }}
          render={({ field, fieldState }) => (
            <View>
              <StepTextInput
                label={t("fields.email")}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                onClear={() => field.onChange("")}
                placeholder="example@email.com"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                // 값이 있는데 형식이 틀렸을 때만 말한다. 타이핑 첫 글자부터
                // 빨간 글씨를 띄우면 아직 다 안 쓴 사람을 나무라는 꼴이다.
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

        <Controller
          name="password"
          control={control}
          rules={{ required: t("validation.passwordRequired") }}
          render={({ field }) => (
            <View>
              <StepTextInput
                label={t("fields.password")}
                value={field.value}
                onChangeText={(text) => {
                  clearLoginError()
                  field.onChange(text)
                }}
                onBlur={field.onBlur}
                placeholder={t("password.placeholder")}
                secureTextEntry
                textContentType="password"
                autoComplete="current-password"
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
                hasError={!!loginError}
              />
              {loginError ? (
                <StepHelperText message={loginError} tone="error" />
              ) : null}
            </View>
          )}
        />

        {/* 비밀번호 재설정은 로그인의 곁가지다. 회색 링크로만 둔다. */}
        <View style={styles.helpRow}>
          <Pressable
            onPress={() => router.push("/(auth)/forgot-password")}
            hitSlop={10}
            accessibilityRole="button"
          >
            <Text style={[styles.helpLink, { color: surface.textWeak }]}>
              {t("login.resetPassword")}
            </Text>
          </Pressable>
        </View>
      </View>
    </AuthScreenLayout>
  )
}

const styles = StyleSheet.create({
  form: { gap: 20, marginTop: 28 },
  helpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 4,
  },
  helpLink: { ...AUTH_TYPE.helper, fontWeight: "500" },
  signupRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 16,
  },
  signupHint: AUTH_TYPE.helper,
  signupLink: {
    ...AUTH_TYPE.helper,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
})
