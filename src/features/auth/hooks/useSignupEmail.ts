import { useState, useEffect, useCallback, useRef } from "react"
import { router } from "expo-router"
import Toast from "react-native-toast-message"
import { showErrorToast } from "@/src/lib/toast"
import { emailService } from "@/src/services"
import { useSignupStore } from "@/src/stores"
import type { EmailLoginLinkRequiredResult, SocialProvider } from "@/src/types"

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

export function useSignupEmail() {
  const setSignupEmail = useSignupStore((s) => s.setEmail)
  const setSignupToken = useSignupStore((s) => s.setSignupToken)

  const [codeSent, setCodeSent] = useState(false)
  const [codeInputVisible, setCodeInputVisible] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [codeVerified, setCodeVerified] = useState(false)
  const [timer, setTimer] = useState(0)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [verifiedEmailLinkToken, setVerifiedEmailLinkToken] = useState<
    string | null
  >(null)
  const [emailLoginLinkRequired, setEmailLoginLinkRequired] =
    useState<EmailLoginLinkRequiredResult | null>(null)
  const [emailLoginLinkMode, setEmailLoginLinkMode] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  const sendEmailLoginLinkCode = async (email: string) => {
    setSendingCode(true)
    setSendError(null)
    try {
      await emailService.sendEmailLoginLinkCode(email)
      setCodeSent(true)
      setCodeVerified(false)
      setVerifiedEmailLinkToken(null)
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
      setSendingCode(false)
    }
  }

  const sendCode = async (email: string) => {
    if (emailLoginLinkMode) {
      await sendEmailLoginLinkCode(email)
      return
    }

    setSendingCode(true)
    setSendError(null)
    setCodeVerified(false)
    setVerifiedEmailLinkToken(null)
    try {
      const check = await emailService.checkSignupEmail(email)
      if (check.status === "email_login_link_required") {
        setEmailLoginLinkRequired(check)
        setCodeInputVisible(false)
        return
      }
      if (check.status === "duplicate") {
        showErrorToast("이미 가입된 이메일로는 회원가입할 수 없습니다")
        setCodeInputVisible(false)
        return
      }
      await emailService.sendVerificationCode(email)
      setCodeSent(true)
      setCodeVerified(false)
      setCodeInputVisible(true)
      startTimer()
    } catch {
      if (!codeSent) setCodeInputVisible(false)
      setSendError("인증번호 전송에 실패했습니다. 재전송해 주세요.")
    } finally {
      setSendingCode(false)
    }
  }

  const verifyCode = async (email: string, code: string) => {
    setVerifyingCode(true)
    try {
      if (emailLoginLinkMode) {
        const result = await emailService.verifyEmailLoginLinkCode(email, code)
        if (result.verified && result.emailLinkToken) {
          if (timerRef.current) clearInterval(timerRef.current)
          setTimer(0)
          setVerifiedEmailLinkToken(result.emailLinkToken)
          setCodeVerified(true)
        } else {
          Toast.show({
            type: "error",
            text1: "인증 오류",
            text2: "인증번호가 올바르지 않거나 만료되었습니다.",
          })
        }
        return
      }

      const result = await emailService.verifyCode(email, code)
      if (result.verified) {
        setCodeVerified(true)
        if (result.signupToken) {
          setSignupToken(result.signupToken)
        }
        if (timerRef.current) clearInterval(timerRef.current)
      } else {
        Toast.show({
          type: "error",
          text1: "인증 오류",
          text2: "인증번호가 올바르지 않거나 만료되었습니다.",
        })
      }
    } catch (e: unknown) {
      Toast.show({
        type: "error",
        text1: "인증 오류",
        text2: e instanceof Error ? e.message : "인증에 실패했습니다.",
      })
    } finally {
      setVerifyingCode(false)
    }
  }

  const handleNext = (email: string) => {
    if (emailLoginLinkMode && verifiedEmailLinkToken) {
      router.push({
        pathname: "./email-login-link-password",
        params: { email, emailLinkToken: verifiedEmailLinkToken },
      })
      return
    }
    setSignupEmail(email)
    router.push("/(auth)/signup-password")
  }

  const dismissEmailLoginLink = () => setEmailLoginLinkRequired(null)

  const confirmEmailLoginLink = async () => {
    if (!emailLoginLinkRequired) return
    const { email } = emailLoginLinkRequired
    setEmailLoginLinkRequired(null)
    setEmailLoginLinkMode(true)
    await sendEmailLoginLinkCode(email)
  }

  const emailLoginLinkProviderLabel = emailLoginLinkRequired?.providers.length
    ? emailLoginLinkRequired.providers
        .map((provider) => PROVIDER_LABELS[provider])
        .join(", ")
    : "소셜"

  const formattedTime = formatTime(timer)

  return {
    codeSent,
    codeInputVisible,
    sendError,
    codeVerified,
    timer,
    formattedTime,
    sendingCode,
    verifyingCode,
    emailLoginLinkRequired,
    emailLoginLinkProviderLabel,
    sendCode,
    verifyCode,
    handleNext,
    dismissEmailLoginLink,
    confirmEmailLoginLink,
  }
}
