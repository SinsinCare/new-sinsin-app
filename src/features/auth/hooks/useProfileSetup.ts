import { useEffect, useState } from "react"
import { router } from "expo-router"
import { useAuth } from "@/src/hooks"
import { nicknameService, authService } from "@/src/services"
import { ApiError } from "@/src/services/core/apiError"
import { showErrorToast } from "@/src/lib/toast"
import { useAuthStore, useSignupStore } from "@/src/stores"
import type { AuthProfile } from "@/src/types"
import {
  identifyAnalyticsUser,
  trackAnalyticsEvent,
} from "@/src/features/analytics"
import { getDestinationForAccountState } from "../utils/accountStateRoute"
import { isProfileSetupCompletionMode } from "../utils/profileSetupMode"
import {
  buildProfileCompletePayload,
  buildSignupPayload,
  isNicknameAvailabilityVerified,
} from "../data/profileSetupFlow"
import type { ProfileSetupDraft } from "../types"

function toBirthDate(profile: AuthProfile) {
  if (!profile.birthYear || !profile.birthMonth || !profile.birthDay) return ""
  return `${profile.birthYear}.${String(profile.birthMonth).padStart(2, "0")}.${String(profile.birthDay).padStart(2, "0")}`
}

function toPrefillValues(profile: AuthProfile): ProfileSetupDraft {
  return {
    name: profile.name ?? "",
    birthDate: toBirthDate(profile),
    gender: profile.gender ?? "",
    phoneNumber: "",
    acquisitionSource: profile.acquisitionSource ?? "",
    acquisitionSourceOther: profile.acquisitionSourceOther ?? "",
    nickname: profile.nickName ?? "",
  }
}

export function useProfileSetup() {
  const signupState = useSignupStore()
  const setSignupInProgress = useSignupStore((s) => s.setSignupInProgress)
  const setUser = useAuthStore((s) => s.setUser)
  const setAccountState = useAuthStore((s) => s.setAccountState)
  const setRequiresAdditionalInfo = useAuthStore(
    (s) => s.setRequiresAdditionalInfo,
  )
  const setEntryGate = useAuthStore((s) => s.setEntryGate)
  const setSessionPersistence = useAuthStore((s) => s.setSessionPersistence)
  const {
    accountState,
    entryGate,
    sessionPersistence,
    requiresAdditionalInfo,
    completeProfile,
    getProfile,
  } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerifyingNickname, setIsVerifyingNickname] = useState(false)
  const [verifiedNickname, setVerifiedNickname] = useState<string | null>(null)
  const [isPrefilling, setIsPrefilling] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [prefillValues, setPrefillValues] = useState<ProfileSetupDraft | null>(
    null,
  )

  const isBackfillMode = accountState === "ACTIVE" && requiresAdditionalInfo
  const isCompletionMode = isProfileSetupCompletionMode({
    accountState,
    entryGate,
    sessionPersistence,
    requiresAdditionalInfo,
  })

  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      setIsPrefilling(true)
      setSubmitError("")
      try {
        const profile = await getProfile()
        if (!cancelled) {
          const prefillValues = toPrefillValues(profile)
          setPrefillValues(prefillValues)
          // The current user's nickname is necessarily unavailable from the
          // public endpoint. Keep it valid until the user edits it.
          setVerifiedNickname(prefillValues.nickname.trim() || null)
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setSubmitError(
            error instanceof Error
              ? error.message
              : "프로필 정보를 불러오지 못했습니다.",
          )
        }
      } finally {
        if (!cancelled) setIsPrefilling(false)
      }
    }

    if (isBackfillMode) {
      void loadProfile()
    } else {
      setPrefillValues(null)
      setVerifiedNickname(null)
    }

    return () => {
      cancelled = true
    }
  }, [getProfile, isBackfillMode])

  const clearNicknameVerification = () => {
    setVerifiedNickname(null)
    setSubmitError("")
  }

  const isNicknameVerified = (draft: ProfileSetupDraft) =>
    isNicknameAvailabilityVerified(verifiedNickname, draft)

  const verifyNickname = async (nickname: string) => {
    if (isVerifyingNickname) return false

    setSubmitError("")
    setIsVerifyingNickname(true)
    try {
      const normalizedNickname = nickname.trim()
      const available =
        await nicknameService.checkNicknameAvailability(normalizedNickname)
      if (!available) {
        setVerifiedNickname(null)
        setSubmitError("이미 사용 중인 닉네임입니다.")
        return false
      }
      setVerifiedNickname(normalizedNickname)
      return true
    } catch (error: unknown) {
      setVerifiedNickname(null)
      if (error instanceof ApiError && error.isNetworkError) {
        showErrorToast(error.message)
      } else {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "닉네임 확인에 실패했습니다. 다시 시도해주세요.",
        )
      }
      return false
    } finally {
      setIsVerifyingNickname(false)
    }
  }

  const submit = async (draft: ProfileSetupDraft) => {
    if (isSubmitting) return

    setSubmitError("")
    if (!isNicknameAvailabilityVerified(verifiedNickname, draft)) {
      setSubmitError("닉네임 중복 확인 후 가입할 수 있습니다.")
      return
    }
    setIsSubmitting(true)
    const wasSignupInProgress = signupState.isSignupInProgress

    try {
      if (isCompletionMode) {
        // Keep the root auth guard on this completion path until the explicit
        // confirmation screen advances to onboarding or home.
        if (!isBackfillMode) setSignupInProgress(true)
        const result = await completeProfile(buildProfileCompletePayload(draft))

        if (!isBackfillMode) {
          router.replace("/(auth)/signup-complete")
          return
        }

        router.replace(
          getDestinationForAccountState(
            result.accountState,
            result.requiresAdditionalInfo,
            result.entryGate,
          ),
        )
        return
      }

      const result = await authService.signup(
        buildSignupPayload(draft, {
          signupToken: signupState.signupToken,
          termsOfServiceAgree: signupState.termsOfServiceAgree,
          privacyPolicyAgree: signupState.privacyPolicyAgree,
          marketingAgree: signupState.marketingAgree,
          pushConsent: signupState.pushConsent,
          nightPushConsent: signupState.nightPushConsent,
          password: signupState.password,
          recommender: signupState.referralCode,
        }),
      )

      setUser(result.user)
      setAccountState(result.accountState)
      setRequiresAdditionalInfo(result.requiresAdditionalInfo)
      setEntryGate(result.entryGate ?? "ONBOARDING")
      setSessionPersistence(result.sessionPersistence ?? "ephemeral")
      setSignupInProgress(true)
      identifyAnalyticsUser(result.user.uid)
      trackAnalyticsEvent("auth_signup_completed", { method: "email" })
      router.replace("/(auth)/signup-complete")
    } catch (error: unknown) {
      if (isCompletionMode) {
        trackAnalyticsEvent("auth_signup_failed", {
          method: "social",
          stage: "profile",
        })
      } else {
        trackAnalyticsEvent("auth_signup_failed", {
          method: "email",
          stage: "account",
        })
      }
      if (error instanceof ApiError && error.isNetworkError) {
        showErrorToast(error.message)
      } else {
        setSubmitError(
          error instanceof Error ? error.message : "회원가입에 실패했습니다.",
        )
      }
      if (!wasSignupInProgress) setSignupInProgress(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    isBackfillMode,
    isCompletionMode,
    isPrefilling,
    isSubmitting,
    isVerifyingNickname,
    submitError,
    prefillValues,
    clearNicknameVerification,
    isNicknameVerified,
    verifyNickname,
    submit,
  }
}
