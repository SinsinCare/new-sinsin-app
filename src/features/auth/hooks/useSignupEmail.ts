import { useState, useEffect, useCallback, useRef } from "react"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import {
  getErrorActionLabel,
  presentError,
  toAnalyticsFailKind,
} from "@/src/lib/errorMessage"
import { showErrorToast } from "@/src/lib/toast"
import { emailService } from "@/src/services"
import { useSignupStore } from "@/src/stores"
import type { EmailLoginLinkRequiredResult } from "@/src/types"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { mapSignupEmailSendFailure } from "../data/signupEmailSendFailure"
import { presentAuthFailure } from "../utils/authFailure"

const TIMER_DURATION = 180

/**
 * `attempt_no` 의 상한. 재전송을 반복하는 한 사람이 브레이크다운의 행 수를 지배하지
 * 않도록 접는다(설계 §J1-4 볼륨·카디널리티). 10회 이상은 전부 10 이다.
 */
const MAX_TRACKED_ATTEMPT = 10

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
  /*
    이 화면에서 몇 번째 발송인지. state 가 아니라 ref 인 이유는 이 값이 화면을 다시
    그릴 이유가 없어서다 — 렌더에 얹으면 발송 때마다 폼 전체가 한 번 더 그려진다.
    이메일을 바꾸면(`resetVerificationState`) 0 으로 되돌린다: 다른 주소로의 첫 발송은
    재전송이 아니다.
  */
  const attemptRef = useRef(0)

  const nextAttemptNo = useCallback(() => {
    attemptRef.current += 1
    return Math.min(attemptRef.current, MAX_TRACKED_ATTEMPT)
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
    attemptRef.current = 0
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
      /* 요청 시점이 아니라 **성공 뒤**에 쏜다. 그래야 화면 진입 → 이 이벤트의 하락이
         곧 발송 실패이고, 별도의 `*_code_send_failed` 를 짓지 않아도 된다. */
      trackAnalyticsEvent("auth_code_requested", {
        source: "email_link",
        attempt_no: nextAttemptNo(),
      })
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
      trackAnalyticsEvent("auth_code_requested", {
        source: "signup",
        attempt_no: nextAttemptNo(),
      })
      setCodeSent(true)
      setCodeVerified(false)
      setCodeInputVisible(true)
      startTimer()
    } catch (error) {
      // 소셜로 가입된 이메일만 화면이 직접 받는다 — 연결 여부를 묻는 모달이 뒤따르고,
      // 예라고 하면 같은 화면이 연결용 번호를 다시 보낸다.
      const sendFailure = mapSignupEmailSendFailure(error)
      if (sendFailure) {
        /* 이 실패는 `presentError` 를 안 지나간다 — 화면이 직접 모달을 띄우고 인라인
           문구를 쓴다. 그래서 `app_error_presented` 로는 절대 대체되지 않는다. */
        trackAnalyticsEvent("auth_email_link_prompt_viewed", {})
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
    /* 서버가 **200 으로** "맞지 않는다" 고 답한 경우다. 오류 봉투가 아니라서
       `presentError` 를 거치지 않고, 따라서 `app_error_presented` 에 한 행도 안 남는다 —
       `auth_signup_email_verified` 하나만으로는 '한 번에 통과' 와 '다섯 번 틀리고 포기'
       가 같아 보인다. */
    trackAnalyticsEvent("auth_code_verify_failed", {
      source: emailLoginLinkMode ? "email_link" : "signup",
      fail_kind: "mismatch",
    })
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
      /* 이 갈래는 `presentError` 도 지나가므로 `app_error_presented` 와 겹친다. 그래도
         같은 이름으로 세는 이유는 위 `mismatch` 와 **한 분모**여야 하기 때문이다 —
         "번호를 넣었는데 안 됐다" 는 사용자에게 한 사건이다. */
      trackAnalyticsEvent("auth_code_verify_failed", {
        source: emailLoginLinkMode ? "email_link" : "signup",
        fail_kind: toAnalyticsFailKind(error),
      })
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
    /* 같은 라우트가 두 가지 일을 한다(가입 인증 / 소셜 계정에 이메일 잇기). 화면 축은
       둘 다 `signup_email` 이라 안 갈리므로, 만료 이벤트의 `source` 는 이 값이 정한다. */
    emailLoginLinkMode,
    sendCode,
    verifyCode,
    resetVerificationState,
    handleNext,
    dismissEmailLoginLink,
    confirmEmailLoginLink,
  }
}
