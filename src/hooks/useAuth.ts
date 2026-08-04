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
import {
  clearClientSession,
  clearClientSessionState,
} from "../services/core/sessionCleanup"
import { logger } from "@/src/lib/logger"
import {
  identifyAnalyticsUser,
  resetAnalyticsIdentity,
  trackAnalyticsEvent,
} from "@/src/features/analytics"
import type {
  ProfileCompleteRequest,
  SocialProvider,
  SocialSignupConsentRequiredResult,
} from "@/src/types"
import type { AuthSessionResult } from "@/src/services/types/serviceTypes"

const SOCIAL_LOGIN_SUCCESS_TRANSITION_MS = 200

/**
 * 세션 복구는 앱 프로세스당 정확히 한 번만.
 *
 * useAuth() 는 루트 레이아웃·진입 라우트·로그인 훅 등 9곳에서 호출되는데,
 * 복구 effect 가 훅 안에 있어 호출처마다 /auth/tokens/refresh 를 따로 쐈습니다.
 * 리프레시 토큰이 회전되는 구조라 동시 호출은 서로를 무효화할 수 있습니다.
 */
let sessionRestorePromise: Promise<void> | null = null

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

export function useAuth() {
  const {
    user,
    accountState,
    isLoading,
    isAuthenticated,
    requiresAdditionalInfo,
    entryGate,
    sessionPersistence,
    setUser,
    setAccountState,
    setRequiresAdditionalInfo,
    setEntryGate,
    setSessionPersistence,
    reset: resetAuth,
  } = useAuthStore()
  const { reset: resetProfile } = useUserStore()

  const applyAuthSession = useCallback(
    (result: AuthSessionResult) => {
      setUser(result.user)
      setAccountState(result.accountState)
      setRequiresAdditionalInfo(result.requiresAdditionalInfo)
      setEntryGate(fallbackEntryGate(result))
      setSessionPersistence(result.sessionPersistence ?? "persistent")
    },
    [
      setAccountState,
      setEntryGate,
      setRequiresAdditionalInfo,
      setSessionPersistence,
      setUser,
    ],
  )

  useEffect(() => {
    const restore = async () => {
      trackAnalyticsEvent("auth_session_restore_started", {})
      try {
        const result = await authService.restoreSession()
        if (result) {
          applyAuthSession(result)
        } else {
          await clearClientSession()
        }
      } catch (error) {
        trackAnalyticsEvent("auth_session_restore_failed", {})
        logger.debug("[useAuth] restore failed", error)
        // 서버에 닿지 못한 것만으로 안전 저장된 refresh token을 삭제하지 않는다.
        // 캐시와 사용자 상태는 비워 민감 데이터가 비인증 화면에 남지 않게 한다.
        clearClientSessionState()
        sessionRestorePromise = null
      }
    }

    // 취소하지 않습니다. 첫 호출처가 언마운트돼도 복구 결과는 스토어에 반영돼야
    // 나머지 호출처가 로딩 상태에 갇히지 않습니다.
    const startRestore = () => {
      sessionRestorePromise ??= restore()
    }
    startRestore()

    // 첫 부팅이 오프라인이었던 경우 토큰을 지우지 않고, 다시 활성화됐을 때 한 번 더
    // 복구한다. 여러 useAuth 호출처가 있어도 전역 promise가 요청을 한 발로 합친다.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && sessionRestorePromise === null) startRestore()
    })
    return () => subscription.remove()
  }, [applyAuthSession])

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
