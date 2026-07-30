import { useEffect, useRef, useState } from "react"
import { Keyboard, StyleSheet, Text, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { Controller, useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/src/hooks/useAuth"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { showErrorToast } from "@/src/lib/toast"
import { ResendCodeLink, StepHelperText, StepTextInput } from "../components"
import { useAuthSurface } from "../hooks/useAuthSurface"
import { AUTH_LAYOUT, AUTH_TYPE } from "../data/authSurface"
import { getDestinationForAccountState } from "../utils/accountStateRoute"
import { AuthScreenLayout } from "./AuthScreenLayout"
import type { EmailForm } from "../types"
import type {
  SocialProvider,
  SocialSignupConsentRequiredResult,
} from "@/src/types"

const TIMER_DURATION = 180
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
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
  const { provider, socialLinkToken } = useLocalSearchParams<{
    provider?: string
    socialLinkToken?: string
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

  const providerValue = isSocialProvider(provider) ? provider : null
  const tokenValue =
    typeof socialLinkToken === "string" && socialLinkToken.length > 0
      ? socialLinkToken
      : null
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
    if (!tokenValue) return
    Keyboard.dismiss()
    setSendingCode(true)
    setSendError(null)
    try {
      await sendSocialLinkEmailCode(tokenValue, getValues("email"))
      setCodeSent(true)
      setCodeInputVisible(true)
      startTimer()
    } catch (error) {
      if (!codeSent) setCodeInputVisible(false)
      setSendError(
        getErrorMessage(error, t("emailVerification.sendFailedCheckEmail")),
      )
    } finally {
      setSendingCode(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!tokenValue) return
    Keyboard.dismiss()
    setVerifyingCode(true)
    setSendError(null)
    try {
      const result = await verifySocialLinkEmailCode(
        tokenValue,
        getValues("email"),
        getValues("code"),
      )
      if (isSocialSignupConsentRequiredResult(result)) {
        router.replace({
          pathname: "/(auth)/terms-agreement",
          params: {
            mode: "social",
            provider: result.provider,
            socialSignupToken: result.socialSignupToken,
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
      setSendError(getErrorMessage(error, t("emailVerification.verifyFailed")))
    } finally {
      setVerifyingCode(false)
    }
  }

  const codeExpired = !sendError && timer === 0 && codeSent

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
                  disabled={sendingCode}
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
