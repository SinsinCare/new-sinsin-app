import { useState, useRef, useCallback, useEffect } from "react"
import { Keyboard, StyleSheet, Text, View } from "react-native"
import { router } from "expo-router"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { emailService, passwordService } from "@/src/services"
import { getErrorMessage } from "@/src/lib/errorUtils"
import {
  PasswordCriteriaText,
  ResendCodeLink,
  StepHelperText,
  StepTextInput,
} from "../components"
import {
  getConfirmPasswordRules,
  getPasswordRules,
} from "../data/passwordValidation"
import { useAuthSurface } from "../hooks/useAuthSurface"
import { AUTH_LAYOUT, AUTH_TYPE } from "../data/authSurface"
import { AuthScreenLayout } from "./AuthScreenLayout"

const TIMER_DURATION = 180
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

interface EmailOtpForm {
  email: string
  code: string
}

interface NewPasswordForm {
  password: string
  confirmPassword: string
}

type Step = "email" | "otp" | "password"

/**
 * 비밀번호 재설정. 가입 이메일 인증과 같은 문법 — 액션은 하단 CTA 하나
 * ("인증번호 받기" → "확인" → "비밀번호 재설정"), 재전송은 텍스트 링크,
 * 남은 시간은 필드 안에. 인증이 확인되면 바로 새 비밀번호 입력으로 넘어간다.
 */
export function ForgotPasswordScreen() {
  const { t } = useTranslation("auth")
  const surface = useAuthSurface()

  const [step, setStep] = useState<Step>("email")
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [codeSent, setCodeSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [timer, setTimer] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const emailOtpForm = useForm<EmailOtpForm>({
    defaultValues: { email: "", code: "" },
    mode: "onChange",
  })

  const passwordForm = useForm<NewPasswordForm>({
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange",
  })

  const emailValue = emailOtpForm.watch("email")
  const codeValue = emailOtpForm.watch("code")
  const password = passwordForm.watch("password")
  const emailValid = EMAIL_PATTERN.test(emailValue.trim())

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimer(TIMER_DURATION)
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleSendCode = async () => {
    Keyboard.dismiss()
    setSendingCode(true)
    setSendError(null)
    try {
      await emailService.sendPasswordResetCode(emailOtpForm.getValues("email"))
      setCodeSent(true)
      setStep("otp")
      startTimer()
    } catch (error) {
      setSendError(
        getErrorMessage(error, t("emailVerification.sendFailedCheckEmail")),
      )
    } finally {
      setSendingCode(false)
    }
  }

  const handleVerifyCode = async () => {
    Keyboard.dismiss()
    setVerifyingCode(true)
    setSendError(null)
    try {
      const result = await emailService.verifyPasswordResetCode(
        emailOtpForm.getValues("email"),
        emailOtpForm.getValues("code"),
      )
      if (result.verified && result.resetToken) {
        setResetToken(result.resetToken)
        if (timerRef.current) clearInterval(timerRef.current)
        setStep("password")
      } else {
        setSendError(t("emailVerification.invalidOrExpired"))
      }
    } catch (error) {
      setSendError(getErrorMessage(error, t("emailVerification.verifyFailed")))
    } finally {
      setVerifyingCode(false)
    }
  }

  const handleResetPassword = async (data: NewPasswordForm) => {
    if (!resetToken) return
    setResettingPassword(true)
    try {
      await passwordService.changePassword(data.password, resetToken)
      router.replace("/(auth)/login")
    } catch (error) {
      passwordForm.setError("password", {
        message: getErrorMessage(error, t("forgotPassword.changeFailed")),
      })
    } finally {
      setResettingPassword(false)
    }
  }

  const codeExpired = step === "otp" && !sendError && timer === 0 && codeSent

  const ctaLabel =
    step === "email"
      ? t("emailVerification.sendCode")
      : step === "otp"
        ? t("common.confirm")
        : t("forgotPassword.change")
  const ctaDisabled =
    step === "email"
      ? !emailValid || sendingCode
      : step === "otp"
        ? codeValue.length !== 6 || verifyingCode
        : !passwordForm.formState.isValid || resettingPassword
  const onCtaPress =
    step === "email"
      ? handleSendCode
      : step === "otp"
        ? handleVerifyCode
        : passwordForm.handleSubmit(handleResetPassword)

  return (
    <AuthScreenLayout
      title={
        step === "password"
          ? t("forgotPassword.newTitle")
          : t("forgotPassword.title")
      }
      subtitle={
        step === "password"
          ? t("forgotPassword.newSubtitle")
          : t("forgotPassword.subtitle")
      }
      buttonLabel={ctaLabel}
      buttonDisabled={ctaDisabled}
      buttonLoading={sendingCode || verifyingCode || resettingPassword}
      onSubmit={onCtaPress}
      keyboardAvoiding
    >
      {step !== "password" ? (
        <View style={styles.body}>
          <Controller
            name="email"
            control={emailOtpForm.control}
            render={({ field }) => (
              <View>
                <StepTextInput
                  autoFocus
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
                  returnKeyType="done"
                  hasError={!!field.value && !emailValid}
                />
                {field.value && !emailValid ? (
                  <StepHelperText
                    message={t("validation.emailInvalid")}
                    tone="error"
                  />
                ) : sendError && step === "email" ? (
                  <StepHelperText message={sendError} tone="error" />
                ) : null}
              </View>
            )}
          />

          {step === "otp" && (
            <Controller
              name="code"
              control={emailOtpForm.control}
              render={({ field }) => (
                <View>
                  <StepTextInput
                    autoFocus
                    label={t("fields.verificationCode")}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder={t("fields.sixDigitCode")}
                    keyboardType="number-pad"
                    maxLength={6}
                    returnKeyType="done"
                    hasError={!!sendError || codeExpired}
                    trailing={
                      timer > 0 ? (
                        <Text style={[styles.timer, { color: surface.brand }]}>
                          {formatTime(timer)}
                        </Text>
                      ) : null
                    }
                  />
                  {sendError ? (
                    <StepHelperText message={sendError} tone="error" />
                  ) : codeExpired ? (
                    <StepHelperText
                      message={t("emailVerification.expired")}
                      tone="error"
                    />
                  ) : null}
                  <ResendCodeLink
                    onPress={handleSendCode}
                    disabled={sendingCode}
                  />
                </View>
              )}
            />
          )}
        </View>
      ) : (
        <View style={styles.body}>
          <Controller
            name="password"
            control={passwordForm.control}
            rules={getPasswordRules()}
            render={({ field, fieldState }) => (
              <View style={styles.group}>
                <StepTextInput
                  autoFocus
                  label={t("fields.newPassword")}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={t("password.newPlaceholder")}
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="new-password"
                  returnKeyType="next"
                  hasError={!!fieldState.error && !!field.value}
                />
                {fieldState.error?.message && field.value ? (
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
            control={passwordForm.control}
            rules={getConfirmPasswordRules(password)}
            render={({ field, fieldState }) => (
              <View>
                <StepTextInput
                  label={t("fields.confirmPassword")}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={t("password.confirmNewPlaceholder")}
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
      )}
    </AuthScreenLayout>
  )
}

const styles = StyleSheet.create({
  body: { marginTop: AUTH_LAYOUT.questionToField, gap: 20 },
  group: { gap: 10 },
  timer: {
    ...AUTH_TYPE.helper,
    fontVariant: ["tabular-nums"],
  },
})
