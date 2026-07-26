import { useCallback, useEffect, useRef, useState } from "react"
import { Keyboard, StyleSheet, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useForm, useWatch } from "react-hook-form"
import { spacing } from "@/src/design-system-v2"
import { useAuth } from "@/src/hooks/useAuth"
import { showErrorToast } from "@/src/lib/toast"
import {
  getDestinationForAccountState,
  type AuthDestination,
} from "../utils/accountStateRoute"
import { AuthScreenLayout } from "./AuthScreenLayout"
import { EmailOtpFieldGroup } from "../components/EmailOtpFieldGroup"
import { OtpVerificationStatus } from "../components/OtpVerificationStatus"
import {
  canVerifyEmailOtp,
  normalizeSignupEmail,
} from "../data/emailVerificationState"
import type { EmailForm } from "../types"
import type {
  SocialProvider,
  SocialSignupConsentRequiredResult,
} from "@/src/types"

const TIMER_DURATION = 180
const PROVIDER_LABELS: Record<SocialProvider, string> = {
  google: "Google",
  apple: "Apple",
  kakao: "카카오",
}

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

export function SocialLinkEmailScreen() {
  const { provider, socialLinkToken } = useLocalSearchParams<{
    provider?: string
    socialLinkToken?: string
  }>()
  const { sendSocialLinkEmailCode, verifySocialLinkEmailCode } = useAuth()

  const [codeSent, setCodeSent] = useState(false)
  const [codeInputVisible, setCodeInputVisible] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [timer, setTimer] = useState(0)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [verificationComplete, setVerificationComplete] = useState(false)
  const [nextRoute, setNextRoute] = useState<AuthDestination>("/onboarding")
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sendingCodeRef = useRef(false)
  const verifyingCodeRef = useRef(false)

  const providerValue = isSocialProvider(provider) ? provider : null
  const tokenValue =
    typeof socialLinkToken === "string" && socialLinkToken.length > 0
      ? socialLinkToken
      : null
  const providerLabel = providerValue ? PROVIDER_LABELS[providerValue] : "소셜"

  const { control, getValues, setValue, trigger } = useForm<EmailForm>({
    defaultValues: { email: "", code: "" },
    mode: "onChange",
  })
  const email = useWatch({ control, name: "email" })
  const previousEmailRef = useRef(normalizeSignupEmail(email))

  useEffect(() => {
    if (!providerValue || !tokenValue) {
      showErrorToast(
        "소셜 로그인 연결 정보가 만료되었습니다. 다시 시도해주세요.",
      )
      router.replace("/(auth)/login")
    }
  }, [providerValue, tokenValue])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

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

  const resetVerificationState = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setCodeSent(false)
    setCodeInputVisible(false)
    setSendError(null)
    setTimer(0)
    setVerificationComplete(false)
    setNextRoute("/onboarding")
  }, [])

  useEffect(() => {
    const normalizedEmail = normalizeSignupEmail(email)
    if (previousEmailRef.current === normalizedEmail) return
    previousEmailRef.current = normalizedEmail
    setValue("code", "")
    resetVerificationState()
  }, [email, resetVerificationState, setValue])

  const handleSendCode = async () => {
    if (
      !tokenValue ||
      sendingCodeRef.current ||
      verifyingCodeRef.current ||
      verificationComplete
    )
      return
    sendingCodeRef.current = true
    const valid = await trigger("email")
    if (!valid) {
      sendingCodeRef.current = false
      return
    }
    Keyboard.dismiss()
    setSendingCode(true)
    setSendError(null)
    setVerificationComplete(false)
    setValue("code", "")
    try {
      await sendSocialLinkEmailCode(tokenValue, getValues("email"))
      setCodeSent(true)
      setCodeInputVisible(true)
      startTimer()
    } catch (error) {
      if (!codeSent) setCodeInputVisible(false)
      setSendError(
        error instanceof Error
          ? error.message
          : "인증번호 전송에 실패했습니다. 재전송해 주세요.",
      )
    } finally {
      sendingCodeRef.current = false
      setSendingCode(false)
    }
  }

  const handleVerifyCode = async () => {
    if (
      !tokenValue ||
      verifyingCodeRef.current ||
      sendingCodeRef.current ||
      verificationComplete
    )
      return
    if (
      !canVerifyEmailOtp({ codeSent, timer, verified: verificationComplete })
    ) {
      if (codeSent && timer <= 0) {
        setSendError("인증 시간이 만료되었습니다. 재전송해주세요.")
      }
      return
    }
    verifyingCodeRef.current = true
    const valid = await trigger("code")
    if (!valid) {
      verifyingCodeRef.current = false
      return
    }
    Keyboard.dismiss()
    setVerifyingCode(true)
    setSendError(null)
    setVerificationComplete(false)
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
      setTimer(0)
      setNextRoute(
        getDestinationForAccountState(
          result.accountState,
          result.requiresAdditionalInfo,
          result.entryGate,
        ),
      )
      setVerificationComplete(true)
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : "인증에 실패했습니다. 다시 시도해주세요.",
      )
    } finally {
      verifyingCodeRef.current = false
      setVerifyingCode(false)
    }
  }

  const formattedTime = formatTime(timer)
  const canVerify = canVerifyEmailOtp({
    codeSent,
    timer,
    error: sendError,
    verified: verificationComplete,
  })

  return (
    <AuthScreenLayout
      title={`${providerLabel} 로그인 계정을\n연결할 이메일을 입력해주세요`}
      subtitle={`입력한 이메일을 기준으로 계정이 생성됩니다. 이미 같은 이메일 계정이 있으면 해당 계정에 ${providerLabel} 로그인을 연결합니다.`}
      buttonLabel={verificationComplete ? "다음" : "로그인 화면으로"}
      onSubmit={() =>
        verificationComplete
          ? router.replace(nextRoute)
          : router.replace("/(auth)/login")
      }
    >
      <View style={styles.form}>
        <EmailOtpFieldGroup<EmailForm>
          control={control}
          emailName="email"
          codeName="code"
          codeInputVisible={codeInputVisible}
          codeSent={codeSent}
          verified={verificationComplete}
          sendingCode={sendingCode}
          verifyingCode={verifyingCode}
          canVerify={canVerify}
          onSendCode={handleSendCode}
          onVerifyCode={handleVerifyCode}
        />
        <OtpVerificationStatus
          codeSent={codeSent}
          error={sendError}
          formattedTime={formattedTime}
          loading={sendingCode || verifyingCode}
          timer={timer}
          verified={verificationComplete}
        />
      </View>
    </AuthScreenLayout>
  )
}

const styles = StyleSheet.create({
  form: { marginTop: spacing[32] + spacing[16] },
})
