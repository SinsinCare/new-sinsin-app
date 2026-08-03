import { useState, useEffect, useCallback, useRef } from "react"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { getErrorActionLabel, presentError } from "@/src/lib/errorMessage"
import { showErrorToast } from "@/src/lib/toast"
import { emailService } from "@/src/services"
import { useSignupStore } from "@/src/stores"
import type { EmailLoginLinkRequiredResult } from "@/src/types"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { mapSignupEmailSendFailure } from "../data/signupEmailSendFailure"
import { presentAuthFailure } from "../utils/authFailure"

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

  /**
   * 발송 실패를 알린다. 문구·그릇·버튼은 서버 코드가 정한다.
   *
   * 예전에는 어떤 실패든 "인증번호를 보내지 못했어요. 이메일 주소와 인터넷 연결을
   * 확인해 주세요." 한 줄이었다. 그 자리에 실제로 오는 것은 이미 보낸 번호가 아직
   * 살아 있다거나(`OTP_ERROR_001`, 30초 뒤 재발송), 이 주소로는 메일이 못 나간다거나
   * (`MAIL_ERROR_001`), 이미 가입된 이메일(`SIGNUP_ERROR_001`)이다 — 셋 다 인터넷과
   * 무관하고 사용자가 할 일이 서로 다르다.
   */
  const reportSendFailure = (error: unknown, scope: string) => {
    if (!codeSent) setCodeInputVisible(false)
    setSendError(presentAuthFailure(error, { scope }))
  }

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
    } catch (error) {
      reportSendFailure(error, "signup-email-link-send")
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
      // 소셜로 가입된 이메일만 화면이 직접 받는다 — 연결 여부를 묻는 모달이 뒤따르고,
      // 예라고 하면 같은 화면이 연결용 번호를 다시 보낸다.
      const sendFailure = mapSignupEmailSendFailure(error)
      if (sendFailure) {
        setEmailLoginLinkRequired(sendFailure)
        setSendError(t("emailVerification.continueVerification"))
        setCodeInputVisible(false)
        return
      }
      reportSendFailure(error, "signup-email-send")
    } finally {
      setSendingCode(false)
    }
  }

  /**
   * 서버가 200 으로 "맞지 않는다" 고 답한 경우. 오류 봉투가 아니라 결과라서 카탈로그를
   * 거치지 않지만, 사용자가 할 일은 `OTP_ERROR_002` 와 같다 — 같은 버튼을 붙여 준다.
   */
  const showCodeMismatch = (email: string) => {
    showErrorToast(
      t("emailVerification.checkTitle"),
      t("emailVerification.invalidOrExpired"),
      {
        label: getErrorActionLabel("resendCode"),
        onPress: () => void sendCode(email),
      },
    )
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
          showCodeMismatch(email)
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
        showCodeMismatch(email)
      }
    } catch (error) {
      // 여기 오는 것의 대부분은 유효 시간이 지난 번호(`OTP_ERROR_002`)와 오타
      // (`OTP_ERROR_003`)다. 예전에는 둘 다 "인터넷 연결을 확인한 뒤…" 로 나갔다.
      presentError(error, {
        scope: emailLoginLinkMode
          ? "signup-email-link-verify"
          : "signup-email-verify",
        resendCode: () => void sendCode(email),
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
