import { useState, useCallback } from "react"
import { router } from "expo-router"
import { authService } from "@/src/services"
import { useAuthStore, useSignupStore } from "@/src/stores"
import { showErrorToast } from "@/src/lib/toast"
import { TERMS } from "../data/terms"
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

  const allChecked = TERMS.every((t) => agreed[t.id])
  const requiredChecked = TERMS.filter((t) => t.required).every(
    (t) => agreed[t.id],
  )
  const canSubmit = requiredChecked

  const toggleAll = useCallback(() => {
    if (allChecked) {
      setAgreed({})
    } else {
      const next: Record<string, boolean> = {}
      TERMS.forEach((t) => {
        next[t.id] = true
      })
      setAgreed(next)
    }
  }, [allChecked])

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
      showErrorToast("소셜 가입 정보가 만료되었습니다. 다시 시도해주세요.")
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
      showErrorToast(
        error instanceof Error
          ? error.message
          : "소셜 회원가입에 실패했습니다. 다시 시도해주세요.",
      )
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
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace("/(auth)/login")
  }

  return {
    terms: TERMS,
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
