import { Text } from "@/src/design-system-v2/primitives/NativeText"
import { useEffect, useRef, useState } from "react"
import { Keyboard, StyleSheet, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { Controller, useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/src/hooks/useAuth"
import { showErrorToast } from "@/src/lib/toast"
import { toAnalyticsFailKind } from "@/src/lib/errorMessage"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { ResendCodeLink, StepHelperText, StepTextInput } from "../components"
import { useAuthSurface } from "../hooks/useAuthSurface"
import { AUTH_LAYOUT, AUTH_TYPE } from "../data/authSurface"
import { presentAuthFailure } from "../utils/authFailure"
import { getDestinationForAccountState } from "../utils/accountStateRoute"
import { AuthScreenLayout } from "./AuthScreenLayout"
import type { EmailForm } from "../types"
import type {
  SocialProvider,
  SocialSignupConsentRequiredResult,
} from "@/src/types"
import { normalizeAuthAttemptId } from "@/src/services/auth/authAttemptId"

const TIMER_DURATION = 180
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** 세 인증 화면이 같은 눈금을 쓴다(`useSignupEmail`·`ForgotPasswordScreen`). */
const MAX_TRACKED_ATTEMPT = 10
function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

function isSocialProvider(value: unknown): value is SocialProvider {
  return value === "google" || value === "apple" || value === "kakao"
}

function isSocialSignupConsentRequiredResult(
  result: unknown,
): result is SocialSignupConsentRequiredResult {
  return (
    !!result &&
    typeof result === "object" &&
    (result as { status?: unknown }).status === "SOCIAL_CONSENT_REQUIRED"
  )
}

/**
 * 소셜 계정-이메일 연결. 가입 이메일 인증과 같은 문법 — 액션은 하단 CTA 하나
 * ("인증번호 받기" → "확인"), 재전송은 텍스트 링크, 남은 시간은 필드 안에.
 * 인증이 확인되면 계정 상태에 맞는 다음 화면으로 바로 넘어간다.
 */
export function SocialLinkEmailScreen() {
  const { t } = useTranslation("auth")
  const { provider, socialLinkToken, authAttemptId } = useLocalSearchParams<{
    provider?: string
    socialLinkToken?: string
    authAttemptId?: string
  }>()
  const { sendSocialLinkEmailCode, verifySocialLinkEmailCode } = useAuth()
  const surface = useAuthSurface()

  const [codeSent, setCodeSent] = useState(false)
  const [codeInputVisible, setCodeInputVisible] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [timer, setTimer] = useState(0)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const attemptRef = useRef(0)
  const sendCodeInFlightRef = useRef(false)
  const verifyCodeInFlightRef = useRef(false)

  const providerValue = isSocialProvider(provider) ? provider : null
  const tokenValue =
    typeof socialLinkToken === "string" && socialLinkToken.length > 0
      ? socialLinkToken
      : null
  const attemptIdValue = normalizeAuthAttemptId(authAttemptId)
  const providerLabels: Record<SocialProvider, string> = {
    google: t("social.providerGoogle"),
    apple: t("social.providerApple"),
    kakao: t("social.providerKakao"),
  }
  const providerLabel = providerValue
    ? providerLabels[providerValue]
    : t("socialLink.providerFallback")

  const { control, getValues } = useForm<EmailForm>({
    defaultValues: { email: "", code: "" },
    mode: "onChange",
  })
  const email = useWatch({ control, name: "email" })
  const code = useWatch({ control, name: "code" })
  const emailValid = EMAIL_PATTERN.test(email.trim())

  useEffect(() => {
    if (!providerValue || !tokenValue) {
      showErrorToast(t("socialLink.expired"))
      router.replace("/(auth)/login")
    }
  }, [providerValue, t, tokenValue])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startTimer = () => {
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
  }

  const handleSendCode = async () => {
    if (
      !tokenValue ||
      sendCodeInFlightRef.current ||
      verifyCodeInFlightRef.current
    ) {
      return
    }
    sendCodeInFlightRef.current = true
    Keyboard.dismiss()
    setSendingCode(true)
    setSendError(null)
    try {
      await sendSocialLinkEmailCode(
        tokenValue,
        getValues("email"),
        attemptIdValue,
      )
      attemptRef.current += 1
      trackAnalyticsEvent("auth_code_requested", {
        source: "social_link",
        attempt_no: Math.min(attemptRef.current, MAX_TRACKED_ATTEMPT),
      })
      setCodeSent(true)
      setCodeInputVisible(true)
      startTimer()
    } catch (error) {
      if (!codeSent) setCodeInputVisible(false)
      setSendError(presentAuthFailure(error, { scope: "social-link-send" }))
    } finally {
      sendCodeInFlightRef.current = false
      setSendingCode(false)
    }
  }

  const handleVerifyCode = async () => {
    if (
      !tokenValue ||
      verifyCodeInFlightRef.current ||
      sendCodeInFlightRef.current
    ) {
      return
    }
    verifyCodeInFlightRef.current = true
    let verificationCompleted = false
    Keyboard.dismiss()
    setVerifyingCode(true)
    setSendError(null)
    try {
      const result = await verifySocialLinkEmailCode(
        tokenValue,
        getValues("email"),
        getValues("code"),
        attemptIdValue,
      )
      // 성공한 OTP/socialLinkToken은 재사용하지 않는다. 화면 전환 직전 같은 handler가
      // 다시 호출돼도 검증 요청은 한 번뿐이어야 한다.
      verificationCompleted = true
      /* 인증이 통과한 순간이 이 곁길의 완주다. 그 뒤 갈 곳이 약관 화면(신규 소셜
         가입으로 이어지는 경우)이든 계정 상태에 맞는 화면이든 **연결 자체는 끝났다** —
         두 갈래를 나누면 같은 성공이 두 숫자로 갈린다. */
      trackAnalyticsEvent("auth_account_link_completed", {
        mode: "social_email",
      })
      if (isSocialSignupConsentRequiredResult(result)) {
        router.replace({
          pathname: "/(auth)/terms-agreement",
          params: {
            mode: "social",
            provider: result.provider,
            socialSignupToken: result.socialSignupToken,
            ...(result.authAttemptId
              ? { authAttemptId: result.authAttemptId }
              : {}),
          },
        })
        return
      }
      if (timerRef.current) clearInterval(timerRef.current)
      // 인증이 끝났으면 바로 이동한다 — 확인 완료 상태를 화면에 남기지 않는다.
      router.replace(
        getDestinationForAccountState(
          result.accountState,
          result.requiresAdditionalInfo,
          result.entryGate,
        ),
      )
    } catch (error) {
      // 이미 다른 계정이 쓰고 있는 이메일(`SIGNUP_ERROR_001`)이면 카탈로그가
      // 다이얼로그로 올린다 — 이 화면에서 고칠 수 없고 로그인으로 가야 한다.
      trackAnalyticsEvent("auth_code_verify_failed", {
        source: "social_link",
        fail_kind: toAnalyticsFailKind(error),
      })
      setSendError(presentAuthFailure(error, { scope: "social-link-verify" }))
    } finally {
      if (!verificationCompleted) verifyCodeInFlightRef.current = false
      setVerifyingCode(false)
    }
  }

  const codeExpired = !sendError && timer === 0 && codeSent

  // 타이머는 매초 갱신된다 — false→true 전이에서만 1회.
  const expiredTrackedRef = useRef(false)
  useEffect(() => {
    if (!codeExpired) {
      expiredTrackedRef.current = false
      return
    }
    if (expiredTrackedRef.current) return
    expiredTrackedRef.current = true
    trackAnalyticsEvent("auth_code_expired", { source: "social_link" })
  }, [codeExpired])

  const ctaLabel = codeInputVisible
    ? t("common.confirm")
    : t("emailVerification.sendCode")
  const ctaDisabled = codeInputVisible
    ? code.length !== 6 || verifyingCode
    : !emailValid || sendingCode
  const onCtaPress = codeInputVisible ? handleVerifyCode : handleSendCode

  return (
    <AuthScreenLayout
      title={t("socialLink.title", { provider: providerLabel })}
      subtitle={t("signupEmail.subtitle")}
      buttonLabel={ctaLabel}
      buttonDisabled={ctaDisabled}
      buttonLoading={sendingCode || verifyingCode}
      onSubmit={onCtaPress}
      keyboardAvoiding
    >
      <View style={styles.body}>
        <Controller
          name="email"
          control={control}
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
              ) : sendError && !codeInputVisible ? (
                <StepHelperText message={sendError} tone="error" />
              ) : null}
            </View>
          )}
        />

        {codeInputVisible && (
          <Controller
            name="code"
            control={control}
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
                  disabled={sendingCode || verifyingCode}
                />
              </View>
            )}
          />
        )}
      </View>
    </AuthScreenLayout>
  )
}

const styles = StyleSheet.create({
  body: { marginTop: AUTH_LAYOUT.questionToField, gap: 20 },
  timer: {
    ...AUTH_TYPE.helper,
    fontVariant: ["tabular-nums"],
  },
})
