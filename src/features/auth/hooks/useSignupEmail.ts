import { useState, useEffect, useCallback, useRef } from "react"
import { router } from "expo-router"
import { emailService } from "@/src/services"
import { useSignupStore } from "@/src/stores"
import { showErrorToast } from "@/src/lib/toast"

const TIMER_DURATION = 180

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

  const sendCode = async (email: string) => {
    setSendingCode(true)
    setSendError(null)
    setCodeInputVisible(true)
    try {
      const available = await emailService.checkEmailAvailability(email)
      if (!available) {
        showErrorToast("이미 가입된 이메일입니다.")
        setCodeInputVisible(false)
        return
      }
      await emailService.sendVerificationCode(email)
      setCodeSent(true)
      setCodeVerified(false)
      startTimer()
    } catch (e: unknown) {
      setSendError("인증번호 전송에 실패했습니다. 재전송해 주세요.")
    } finally {
      setSendingCode(false)
    }
  }

  const verifyCode = async (email: string, code: string) => {
    setVerifyingCode(true)
    try {
      const result = await emailService.verifyCode(email, code)
      if (result.verified) {
        setCodeVerified(true)
        if (result.signupToken) {
          setSignupToken(result.signupToken)
        }
        if (timerRef.current) clearInterval(timerRef.current)
      }
    } catch (e: unknown) {
      showErrorToast(e instanceof Error ? e.message : "인증에 실패했습니다.")
    } finally {
      setVerifyingCode(false)
    }
  }

  const handleNext = (email: string) => {
    setSignupEmail(email)
    router.push("/(auth)/signup-password")
  }

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
    sendCode,
    verifyCode,
    handleNext,
  }
}
