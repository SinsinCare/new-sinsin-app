import { useState, useCallback, useMemo } from "react"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { authService } from "@/src/services"
import { useAuthStore, useSignupStore } from "@/src/stores"
import { showErrorToast } from "@/src/lib/toast"
import { presentError } from "@/src/lib/errorMessage"
import { useGoBack } from "@/src/shared/navigation"
import { getTerms } from "../data/terms"
import { getDestinationForAccountState } from "../utils/accountStateRoute"
import {
  identifyAnalyticsUser,
  trackAnalyticsEvent,
} from "@/src/features/analytics"

interface UseTermsAgreementOptions {
  mode?: "email" | "social"
  socialSignupToken?: string
}

export function useTermsAgreement({
  mode = "email",
  socialSignupToken,
}: UseTermsAgreementOptions = {}) {
  const { t } = useTranslation("auth")
  // 이메일 가입에서 뒤로 = 직전 화면. 딥링크로 약관에 바로 들어왔으면
  // 라우트 그래프가 로그인으로 보낸다.
  const goBack = useGoBack()
  const terms = useMemo(getTerms, [t])
  const [agreed, setAgreed] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const {
    reset,
    setTermsOfServiceAgree,
    setPrivacyPolicyAgree,
    setMarketingAgree,
    setSignupInProgress,
  } = useSignupStore()
  const setUser = useAuthStore((s) => s.setUser)
  const setAccountState = useAuthStore((s) => s.setAccountState)
  const setRequiresAdditionalInfo = useAuthStore(
    (s) => s.setRequiresAdditionalInfo,
  )
  const setEntryGate = useAuthStore((s) => s.setEntryGate)
  const setSessionPersistence = useAuthStore((s) => s.setSessionPersistence)

  const allChecked = terms.every((term) => agreed[term.id])
  const requiredChecked = terms
    .filter((term) => term.required)
    .every((term) => agreed[term.id])
  const canSubmit = requiredChecked

  const toggleAll = useCallback(() => {
    if (allChecked) {
      setAgreed({})
    } else {
      const next: Record<string, boolean> = {}
      terms.forEach((term) => {
        next[term.id] = true
      })
      setAgreed(next)
    }
  }, [allChecked, terms])

  const toggleItem = useCallback((id: string) => {
    setAgreed((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const handleEmailNext = () => {
    if (!canSubmit) return
    trackAnalyticsEvent("auth_signup_started", { method: "email" })
    reset()
    setSignupInProgress(true)
    setTermsOfServiceAgree(!!agreed["service"])
    setPrivacyPolicyAgree(!!agreed["privacy"])
    setMarketingAgree(!!agreed["marketing"])
    router.push("/(auth)/signup-email")
  }

  const handleSocialNext = async () => {
    if (!canSubmit || isSubmitting) return
    if (!socialSignupToken) {
      reset()
      showErrorToast(t("terms.expired"))
      router.replace("/(auth)/login")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await authService.completeSocialSignup({
        socialSignupToken,
        termsOfServiceAgree: !!agreed["service"],
        privacyPolicyAgree: !!agreed["privacy"],
        marketingAgree: !!agreed["marketing"],
      })

      reset()
      setUser(result.user)
      setAccountState(result.accountState)
      setRequiresAdditionalInfo(result.requiresAdditionalInfo)
      setEntryGate(result.entryGate ?? "PROFILE")
      setSessionPersistence(result.sessionPersistence ?? "ephemeral")
      identifyAnalyticsUser(result.user.uid)
      if (result.accountState !== "PENDING_PROFILE") {
        trackAnalyticsEvent("auth_signup_completed", { method: "social" })
      }
      router.replace(
        getDestinationForAccountState(
          result.accountState,
          result.requiresAdditionalInfo,
          result.entryGate,
        ),
      )
    } catch (error) {
      trackAnalyticsEvent("auth_signup_failed", {
        method: "social",
        stage: "consent",
      })
      /* 폴백("회원가입을 마치지 못했어요")은 넘기지 않는다. 이 요청이 돌려주는 것은
         만료된 가입 토큰(`TOKEN_ERROR_005`)·이미 가입을 마친 계정(`SIGNUP_ERROR_004`)
         이고, 둘 다 다시 눌러서는 풀리지 않는다 — 무엇이 막고 있는지 말해 줘야 한다.

         `retry` 는 통신 실패에만 붙는다(어느 코드에 어떤 버튼을 줄지는 카탈로그가
         정한다). 동의 값이 화면에 그대로 남아 있어 다시 보내는 것이 같은 동작이다. */
      presentError(error, {
        scope: "social-signup-consent",
        retry: () => void handleSocialNext(),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (mode === "social") {
      void handleSocialNext()
      return
    }
    handleEmailNext()
  }

  const handleBack = () => {
    if (isSubmitting) return
    if (mode === "social") {
      reset()
      router.replace("/(auth)/login")
      return
    }
    goBack()
  }

  return {
    terms,
    agreed,
    allChecked,
    requiredChecked,
    canSubmit,
    isSubmitting,
    marketingAgree: !!agreed["marketing"],
    toggleAll,
    toggleItem,
    handleBack,
    handleNext,
  }
}
