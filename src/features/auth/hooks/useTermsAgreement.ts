import { useState, useCallback, useRef } from "react"
import { router } from "expo-router"
import { authService } from "@/src/services"
import { useAuthStore, useSignupStore } from "@/src/stores"
import { showErrorToast } from "@/src/lib/toast"
import { notificationService } from "@/src/services/notificationService"
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
  const [isRequestingPushPermission, setIsRequestingPushPermission] =
    useState(false)
  const pushPermissionRequestInFlightRef = useRef(false)
  const {
    reset,
    setTermsOfServiceAgree,
    setPrivacyPolicyAgree,
    setMarketingAgree,
    setPushConsent,
    setNightPushConsent,
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

  const requestPushConsent = useCallback(async (selectNightPush = false) => {
    if (pushPermissionRequestInFlightRef.current) return false
    pushPermissionRequestInFlightRef.current = true
    setIsRequestingPushPermission(true)
    try {
      const granted = await notificationService.requestPermissions()
      setAgreed((previous) => ({
        ...previous,
        push_notifications: granted,
        night_push_notifications: granted && selectNightPush,
      }))
      if (!granted) {
        showErrorToast("알림 권한을 허용하지 않아 푸시 동의가 해제되었어요.")
      }
      return granted
    } catch {
      setAgreed((previous) => ({
        ...previous,
        push_notifications: false,
        night_push_notifications: false,
      }))
      showErrorToast("알림 권한을 확인하지 못해 푸시 동의가 해제되었어요.")
      return false
    } finally {
      pushPermissionRequestInFlightRef.current = false
      setIsRequestingPushPermission(false)
    }
  }, [])

  const toggleAll = useCallback(() => {
    if (allChecked) {
      setAgreed({})
    } else {
      const next: Record<string, boolean> = {}
      TERMS.forEach((t) => {
        next[t.id] =
          t.id !== "push_notifications" && t.id !== "night_push_notifications"
      })
      setAgreed(next)
      void requestPushConsent(true)
    }
  }, [allChecked, requestPushConsent])

  const toggleItem = useCallback(
    (id: string) => {
      if (id === "push_notifications") {
        if (agreed[id]) {
          setAgreed((previous) => ({
            ...previous,
            [id]: false,
            night_push_notifications: false,
          }))
        } else {
          void requestPushConsent()
        }
        return
      }
      if (id === "night_push_notifications") {
        if (!agreed.push_notifications || !agreed.marketing) return
        setAgreed((previous) => ({ ...previous, [id]: !previous[id] }))
        return
      }
      if (id === "marketing" && agreed[id]) {
        setAgreed((previous) => ({
          ...previous,
          marketing: false,
          night_push_notifications: false,
        }))
        return
      }
      setAgreed((previous) => ({ ...previous, [id]: !previous[id] }))
    },
    [agreed, requestPushConsent],
  )

  const handleEmailNext = () => {
    if (!canSubmit) return
    trackAnalyticsEvent("auth_signup_started", { method: "email" })
    reset()
    setSignupInProgress(true)
    setTermsOfServiceAgree(!!agreed["service"])
    setPrivacyPolicyAgree(!!agreed["privacy"])
    setMarketingAgree(!!agreed["marketing"])
    setPushConsent(!!agreed["push_notifications"])
    setNightPushConsent(!!agreed["night_push_notifications"])
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
        pushConsent: !!agreed["push_notifications"],
        nightPushConsent: !!agreed["night_push_notifications"],
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
    isRequestingPushPermission,
    marketingAgree: !!agreed["marketing"],
    toggleAll,
    toggleItem,
    handleBack,
    handleNext,
  }
}
