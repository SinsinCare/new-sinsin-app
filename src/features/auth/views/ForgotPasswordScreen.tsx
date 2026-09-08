import { Text } from "@/src/design-system-v2/primitives/NativeText"
import { useState, useRef, useCallback, useEffect } from "react"
import { Keyboard, StyleSheet, View } from "react-native"
import { router } from "expo-router"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { emailService, passwordService } from "@/src/services"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { toAnalyticsFailKind } from "@/src/lib/errorMessage"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import {
  PasswordCriteriaText,
  ResendCodeLink,
  StepHelperText,
  StepTextInput,
} from "../components"
import {
  PASSWORD_FIELD_ORDER,
  getConfirmPasswordRules,
  getPasswordRules,
} from "../data/passwordValidation"
import { trackFormValidationFailed } from "@/src/shared/utils/formValidationState"
import { useAuthSurface } from "../hooks/useAuthSurface"
import { AUTH_LAYOUT, AUTH_TYPE } from "../data/authSurface"
import { presentAuthFailure } from "../utils/authFailure"
import { AuthScreenLayout } from "./AuthScreenLayout"

const TIMER_DURATION = 180
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** `useSignupEmail` 과 같은 상한. 두 화면의 `attempt_no` 가 같은 눈금이어야 비교된다. */
const MAX_TRACKED_ATTEMPT = 10

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
  const attemptRef = useRef(0)

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
      /* 성공한 뒤에 쏜다 — 그래야 `screen:password_reset` → 이 이벤트의 하락이 곧
         "가입한 적 없는 이메일(`AUTH_ERROR_001`)로 막힌 사람" 이다. */
      attemptRef.current += 1
      trackAnalyticsEvent("auth_code_requested", {
        source: "password_reset",
        attempt_no: Math.min(attemptRef.current, MAX_TRACKED_ATTEMPT),
      })
      setCodeSent(true)
      setStep("otp")
      startTimer()
    } catch (error) {
      // 가입한 적 없는 이메일(`AUTH_ERROR_001`)이 이 화면의 가장 흔한 실패다.
      // 폴백("이메일 주소를 확인한 뒤 다시 시도해 주세요")으로 덮으면 주소가
      // 틀렸는지 계정이 없는지를 사용자가 끝내 구분할 수 없다.
      setSendError(presentAuthFailure(error, { scope: "password-reset-send" }))
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
        // 서버가 200 으로 "맞지 않는다" 고 답한 경우. 오류 봉투가 아니라 인라인 한 줄로
        // 끝나므로 `app_error_presented` 에 아무 흔적이 없다.
        trackAnalyticsEvent("auth_code_verify_failed", {
          source: "password_reset",
          fail_kind: "mismatch",
        })
        setSendError(t("emailVerification.invalidOrExpired"))
      }
    } catch (error) {
      trackAnalyticsEvent("auth_code_verify_failed", {
        source: "password_reset",
        fail_kind: toAnalyticsFailKind(error),
      })
      setSendError(
        presentAuthFailure(error, { scope: "password-reset-verify" }),
      )
    } finally {
      setVerifyingCode(false)
    }
  }

  const handleResetPassword = async (data: NewPasswordForm) => {
    if (!resetToken) return
    setResettingPassword(true)
    try {
      await passwordService.changePassword(data.password, resetToken)
      /* 로그인 못 하는 사람이 **스스로 복구에 성공한** 순간. `router.replace` 전에
         쏜다 — 화면이 사라진 뒤에는 이 컴포넌트가 아무 것도 못 쏜다. */
      trackAnalyticsEvent("auth_password_reset_completed", {})
      router.replace("/(auth)/login")
    } catch (error) {
      // 재설정 토큰이 만료됐다는 것(`TOKEN_ERROR_006`)이 여기서 가장 흔하다.
      // "잠시 후 다시 시도해 주세요" 로 덮으면 기다릴수록 더 안 되는 안내가 된다.
      passwordForm.setError("password", {
        message: getErrorMessage(error),
      })
    } finally {
      setResettingPassword(false)
    }
  }

  const codeExpired = step === "otp" && !sendError && timer === 0 && codeSent

  // 타이머는 매초 갱신된다 — false→true 전이에서만 1회. (`SignupEmailScreen` 과 같은 규약)
  const expiredTrackedRef = useRef(false)
  useEffect(() => {
    if (!codeExpired) {
      expiredTrackedRef.current = false
      return
    }
    if (expiredTrackedRef.current) return
    expiredTrackedRef.current = true
    trackAnalyticsEvent("auth_code_expired", { source: "password_reset" })
  }, [codeExpired])

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
        : passwordForm.handleSubmit(handleResetPassword, (errors) =>
            trackFormValidationFailed(
              "password_reset_new",
              PASSWORD_FIELD_ORDER,
              errors,
            ),
          )

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
