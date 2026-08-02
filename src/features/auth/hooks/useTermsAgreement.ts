import { useState, useCallback, useMemo } from "react"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { authService } from "@/src/services"
import { useAuthStore, useSignupStore } from "@/src/stores"
import { showErrorToast } from "@/src/lib/toast"
import { getErrorMessage } from "@/src/lib/errorUtils"
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
      showErrorToast(getErrorMessage(error, t("terms.submitFailed")))
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
