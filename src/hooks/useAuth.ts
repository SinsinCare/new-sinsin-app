import { useCallback, useEffect } from "react"
import { AppState } from "react-native"
import { useAuthStore, useUserStore } from "../stores"
import {
  authService,
  persistSocialReauthenticationIntentForSignOut,
  type AuthSignOutReason,
} from "../services/auth/authService"
import {
  signInWithSocialProvider as nativeSocialSignIn,
  isUserCancelledError,
} from "../services/auth/socialAuthService"
import { clearClientSession } from "../services/core/sessionCleanup"
import { logger } from "@/src/lib/logger"
import {
  identifyAnalyticsUser,
  resetAnalyticsIdentity,
  trackAnalyticsEvent,
} from "@/src/features/analytics"
import { bootstrapAuthSession } from "@/src/features/auth/utils/authSessionBootstrap"
import type {
  ProfileCompleteRequest,
  SocialProvider,
  SocialSignupConsentRequiredResult,
} from "@/src/types"
import type { AuthSessionResult } from "@/src/services/types/serviceTypes"

const SOCIAL_LOGIN_SUCCESS_TRANSITION_MS = 200

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function isSocialSignupConsentRequiredResult(
  result: unknown,
): result is SocialSignupConsentRequiredResult {
  return (
    !!result &&
    typeof result === "object" &&
    (result as { status?: unknown }).status === "SOCIAL_CONSENT_REQUIRED"
  )
}

function fallbackEntryGate(result: AuthSessionResult) {
  if (result.entryGate) return result.entryGate
  if (result.accountState === "PENDING_PROFILE") return "PROFILE" as const
  if (result.accountState === "PENDING_ONBOARDING") {
    return "ONBOARDING" as const
  }
  if (result.accountState === "ACTIVE" && result.requiresAdditionalInfo) {
    return "PROFILE" as const
  }
  return "HOME" as const
}

function applyAuthSession(result: AuthSessionResult) {
  const {
    setUser,
    setAccountState,
    setRequiresAdditionalInfo,
    setEntryGate,
    setSessionPersistence,
  } = useAuthStore.getState()

  setUser(result.user)
  setAccountState(result.accountState)
  setRequiresAdditionalInfo(result.requiresAdditionalInfo)
  setEntryGate(fallbackEntryGate(result))
  setSessionPersistence(result.sessionPersistence ?? "persistent")
}

export function useAuthSessionBootstrap() {
  useEffect(() => {
    let cancelled = false

    const restore = async () => {
      trackAnalyticsEvent("auth_session_restore_started", {})
      try {
        await bootstrapAuthSession({
          isAuthenticated: () =>
            cancelled || useAuthStore.getState().isAuthenticated,
          restoreSession: authService.restoreSession,
          applyAuthSession,
          clearClientSession,
        })
      } catch (error) {
        if (cancelled) return
        trackAnalyticsEvent("auth_session_restore_failed", {})
        logger.debug("[useAuth] restore failed", error)
        if (!useAuthStore.getState().isAuthenticated) {
          await clearClientSession()
        }
      }
    }
    void restore()

    return () => {
      cancelled = true
    }
  }, [])
}

export function useAuth() {
  const {
    user,
    accountState,
    isLoading,
    isAuthenticated,
    requiresAdditionalInfo,
    entryGate,
    sessionPersistence,
    reset: resetAuth,
  } = useAuthStore()
  const { reset: resetProfile } = useUserStore()

  const signInWithEmail = async (email: string, password: string) => {
    trackAnalyticsEvent("auth_email_login_started", {})
    try {
      const result = await authService.signInWithEmail(email, password)
      applyAuthSession(result)
      identifyAnalyticsUser(result.user.uid)
      trackAnalyticsEvent("auth_email_login_succeeded", {})
      return result
    } catch (error) {
      trackAnalyticsEvent("auth_email_login_failed", {})
      throw error
    }
  }

  const signInWithSocialProvider = async (provider: SocialProvider) => {
    trackAnalyticsEvent("auth_social_login_started", { provider })
    try {
      logger.debug("[useAuth] signInWithSocialProvider", provider)
      const socialResult = await nativeSocialSignIn(provider)
      const result = await authService.signInWithSocial(
        socialResult.provider,
        socialResult.idToken,
        socialResult.email,
        socialResult.displayName,
      )
      logger.debug("[useAuth] social login 완료", {
        provider,
        accountState: isSocialSignupConsentRequiredResult(result)
          ? result.status
          : result.accountState,
      })
      if (isSocialSignupConsentRequiredResult(result)) {
        trackAnalyticsEvent("auth_signup_started", { method: "social" })
        return result
      }
      await delay(SOCIAL_LOGIN_SUCCESS_TRANSITION_MS)
      applyAuthSession(result)
      identifyAnalyticsUser(result.user.uid)
      trackAnalyticsEvent("auth_social_login_succeeded", { provider })
      return result
    } catch (error) {
      trackAnalyticsEvent("auth_social_login_failed", { provider })
      throw error
    }
  }

  const signInWithGoogle = () => signInWithSocialProvider("google")
  const signInWithApple = () => signInWithSocialProvider("apple")
  const signInWithKakao = () => signInWithSocialProvider("kakao")

  const sendSocialLinkEmailCode = (socialLinkToken: string, email: string) =>
    authService.sendSocialLinkEmailCode(socialLinkToken, email)

  const verifySocialLinkEmailCode = async (
    socialLinkToken: string,
    email: string,
    code: string,
  ) => {
    const result = await authService.verifySocialLinkEmailCode(
      socialLinkToken,
      email,
      code,
    )
    if (isSocialSignupConsentRequiredResult(result)) {
      return result
    }
    await delay(SOCIAL_LOGIN_SUCCESS_TRANSITION_MS)
    applyAuthSession(result)
    return result
  }

  const completeEmailLoginLink = async (
    emailLinkToken: string,
    password: string,
  ) => {
    const result = await authService.completeEmailLoginLink(
      emailLinkToken,
      password,
    )
    applyAuthSession(result)
    return result
  }

  const completeProfile = async (request: ProfileCompleteRequest) => {
    const isSignupCompletion = accountState === "PENDING_PROFILE"
    try {
      const result = await authService.completeProfile(request)
      applyAuthSession(result)
      identifyAnalyticsUser(result.user.uid)
      if (isSignupCompletion) {
        trackAnalyticsEvent("auth_signup_completed", { method: "social" })
      }
      return result
    } catch (error) {
      if (isSignupCompletion) {
        trackAnalyticsEvent("auth_signup_failed", {
          method: "social",
          stage: "profile",
        })
      }
      throw error
    }
  }

  const getProfile = useCallback(() => authService.getProfile(), [])

  const cancelWithdrawal = async (cancelToken: string) => {
    const result = await authService.cancelWithdrawal(cancelToken)
    applyAuthSession(result)
    trackAnalyticsEvent("auth_withdrawal_cancelled", {})
    return result
  }

  const signOut = useCallback(
    async (reason: AuthSignOutReason = "automatic") => {
      try {
        await authService.signOut()
      } finally {
        try {
          await persistSocialReauthenticationIntentForSignOut(reason)
        } finally {
          resetAnalyticsIdentity()
          await clearClientSession()
          resetProfile()
          resetAuth()
        }
      }
    },
    [resetAuth, resetProfile],
  )

  useEffect(() => {
    if (!isAuthenticated || sessionPersistence !== "ephemeral") return

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") void signOut("automatic")
    })
    return () => subscription.remove()
  }, [isAuthenticated, sessionPersistence, signOut])

  return {
    user,
    accountState,
    requiresAdditionalInfo,
    entryGate,
    sessionPersistence,
    isLoading,
    isAuthenticated,
    signInWithSocialProvider,
    signInWithEmail,
    signInWithGoogle,
    signInWithApple,
    signInWithKakao,
    sendSocialLinkEmailCode,
    verifySocialLinkEmailCode,
    completeEmailLoginLink,
    completeProfile,
    getProfile,
    cancelWithdrawal,
    promoteSession: async () => {
      const result = await authService.promoteSession()
      applyAuthSession(result)
      return result
    },
    isUserCancelledError,
    signOut,
  }
}
