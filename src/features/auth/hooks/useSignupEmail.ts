import { useState, useEffect, useCallback, useRef } from "react"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import Toast from "react-native-toast-message"
import { showErrorToast } from "@/src/lib/toast"
import { emailService } from "@/src/services"
import { useSignupStore } from "@/src/stores"
import type { EmailLoginLinkRequiredResult } from "@/src/types"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { mapSignupEmailSendFailure } from "../data/signupEmailSendFailure"

const TIMER_DURATION = 180

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

export function useSignupEmail() {
  const { t } = useTranslation("auth")
  const setSignupEmail = useSignupStore((s) => s.setEmail)
  const setSignupToken = useSignupStore((s) => s.setSignupToken)

  const [codeSent, setCodeSent] = useState(false)
  const [codeInputVisible, setCodeInputVisible] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [codeVerified, setCodeVerified] = useState(false)
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null)
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

  const resetVerificationState = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setCodeSent(false)
    setCodeInputVisible(false)
    setSendError(null)
    setCodeVerified(false)
    setVerifiedEmail(null)
    setTimer(0)
    setVerifiedEmailLinkToken(null)
    setEmailLoginLinkRequired(null)
    setEmailLoginLinkMode(false)
    setSignupToken("")
  }, [setSignupToken])

  const sendEmailLoginLinkCode = async (email: string) => {
    setSendingCode(true)
    setSendError(null)
    try {
      await emailService.sendEmailLoginLinkCode(email)
      setCodeSent(true)
      setCodeVerified(false)
      setVerifiedEmail(null)
      setVerifiedEmailLinkToken(null)
      setCodeInputVisible(true)
      startTimer()
    } catch {
      if (!codeSent) setCodeInputVisible(false)
      setSendError(t("emailVerification.sendFailed"))
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
    setVerifiedEmail(null)
    setVerifiedEmailLinkToken(null)
    try {
      await emailService.sendVerificationCode(email)
      setCodeSent(true)
      setCodeVerified(false)
      setCodeInputVisible(true)
      startTimer()
    } catch (error) {
      const sendFailure = mapSignupEmailSendFailure(error)
      if (sendFailure?.status === "email_login_link_required") {
        setEmailLoginLinkRequired(sendFailure)
        setSendError(t("emailVerification.continueVerification"))
        setCodeInputVisible(false)
        return
      }
      if (sendFailure?.status === "duplicate") {
        showErrorToast(t("emailVerification.duplicate"))
        setCodeInputVisible(false)
        return
      }
      if (!codeSent) setCodeInputVisible(false)
      setSendError(t("emailVerification.sendFailed"))
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
          setVerifiedEmail(email)
          setCodeVerified(true)
        } else {
          Toast.show({
            type: "error",
            text1: t("emailVerification.checkTitle"),
            text2: t("emailVerification.invalidOrExpired"),
          })
        }
        return
      }

      const result = await emailService.verifyCode(email, code)
      if (result.verified) {
        trackAnalyticsEvent("auth_signup_email_verified", {})
        setCodeVerified(true)
        setVerifiedEmail(email)
        if (result.signupToken) {
          setSignupToken(result.signupToken)
        }
        if (timerRef.current) clearInterval(timerRef.current)
      } else {
        Toast.show({
          type: "error",
          text1: t("emailVerification.checkTitle"),
          text2: t("emailVerification.invalidOrExpired"),
        })
      }
    } catch {
      Toast.show({
        type: "error",
        text1: t("emailVerification.emailVerifyFailedTitle"),
        text2: t("login.networkError"),
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
    setSendError(null)
    await sendEmailLoginLinkCode(email)
  }

  const formattedTime = formatTime(timer)

  return {
    codeSent,
    codeInputVisible,
    sendError,
    codeVerified,
    verifiedEmail,
    timer,
    formattedTime,
    sendingCode,
    verifyingCode,
    emailLoginLinkRequired,
    sendCode,
    verifyCode,
    resetVerificationState,
    handleNext,
    dismissEmailLoginLink,
    confirmEmailLoginLink,
  }
}
