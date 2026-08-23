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
import { toAnalyticsFailKind } from "@/src/lib/errorMessage"
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
      /* 인증 화면의 실패는 대부분 필드 아래 한 줄로 끝나고 `presentError` 를 지나가지
         않는다(`presentAuthFailure` 가 다이얼로그 갈래만 넘긴다). 그래서 갈래를 여기서
         같이 싣지 않으면 "비밀번호가 틀렸다" 와 "가입한 적이 없다" 가 영원히 한 숫자다. */
      trackAnalyticsEvent("auth_email_login_failed", {
        fail_kind: toAnalyticsFailKind(error),
      })
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
      /*
        취소는 실패가 아니다.

        종전에는 이 catch 가 전부를 `auth_social_login_failed` 로 세었다 — 사용자가
        구글/카카오 시트를 그냥 닫은 것까지. 그래서 대시보드의 '소셜 실패율' 은 실패가
        아니라 '취소+실패' 였고, 장애 지표로 쓸 수 없었다(설계 §J1-4).

        가르는 자리를 여기로 잡은 이유는 **여기가 유일하게 배타적**이기 때문이다.
        호출부(`useSocialLogin`)도 같은 판정을 하지만 그쪽은 이 catch 뒤에 돌아서,
        거기서 취소를 쏘면 이미 나간 failed 를 되돌릴 수 없다.
      */
      if (isUserCancelledError(error)) {
        trackAnalyticsEvent("auth_social_login_cancelled", { provider })
      } else {
        trackAnalyticsEvent("auth_social_login_failed", { provider })
      }
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
      /*
        **맨 앞에서 쏜다.** 아래 `finally` 사슬은 서버 로그아웃이 실패해도 세션을
        비우므로, 이 함수에 들어온 것 자체가 곧 로그아웃이다. 뒤로 미루면 서버가
        느린 날의 자동 로그아웃이 백그라운드 종료에 잘려 통째로 사라진다.

        `reason` 을 나누는 이유는 이 둘이 **정반대의 사건**이기 때문이다.
        `'automatic'` 은 `sessionPersistence:'ephemeral'` 계정이 백그라운드로 들어가는
        즉시 잘린 것으로 사용자가 원한 적이 없고, 그 코호트는 앱을 잠깐 내렸다 올릴
        때마다 로그인 화면을 다시 만나 로그인 퍼널 분모에 재로그인을 섞는다(설계 §9-⑤).
      */
      trackAnalyticsEvent("auth_signed_out", { reason })
      try {
        await authService.signOut()
      } finally {
        try {
          await persistSocialReauthenticationIntentForSignOut(reason)
        } finally {
          /*
            익명 id 는 **기기 축이라 로그아웃해도 유지된다**(`analyticsClient` 머리말).
            그래서 로그아웃 뒤 이 기기에서 쌓인 익명 이벤트는, 다음에 로그인한 사람이
            누구든 서버의 소급 귀속으로 **그 사람에게 붙는다.** 공용 기기·계정 전환이
            섞인 데이터를 개인 단위로 읽으면 안 된다는 뜻이다.
          */
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
