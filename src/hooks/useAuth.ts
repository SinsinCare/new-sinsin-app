import { useCallback, useEffect } from "react"
import { AppState } from "react-native"
import { useShallow } from "zustand/react/shallow"
import { useAuthStore } from "../stores"
import {
  authService,
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
import { createSocialAuthCoordinator } from "@/src/services/auth/socialAuthCoordinator"

const SOCIAL_LOGIN_SUCCESS_TRANSITION_MS = 200
const socialAuthCoordinator = createSocialAuthCoordinator<AuthSessionResult>()

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

/*
  로그아웃은 **한 번에 한 건**만 돈다.

  `useAuth` 는 `_layout`·설정·로그인 화면 등 여러 곳이 동시에 부르고, ephemeral
  세션의 자동 로그아웃 리스너는 그 인스턴스마다 하나씩 붙는다. 백그라운드로 가는
  한 번의 사건에 `signOut("automatic")` 이 인스턴스 수만큼 불려 POST /auth/logout
  과 `auth_signed_out` 이 N 번 나갔다. `refreshAccessToken` 과 같은 방식으로
  진행 중인 한 건을 모두가 공유한다.
*/
let signOutInFlight: Promise<void> | null = null

async function runSignOut(reason: AuthSignOutReason): Promise<void> {
  /*
    **맨 앞에서 쏜다.** 아래 `finally` 는 서버 로그아웃이 실패해도 세션을 비우므로,
    이 함수에 들어온 것 자체가 곧 로그아웃이다. 뒤로 미루면 서버가 느린 날의
    자동 로그아웃이 백그라운드 종료에 잘려 통째로 사라진다.

    `reason` 을 나누는 이유는 이 둘이 **정반대의 사건**이기 때문이다.
    `'automatic'` 은 `sessionPersistence:'ephemeral'` 계정이 백그라운드로 들어가는
    즉시 잘린 것으로 사용자가 원한 적이 없고, 그 코호트는 앱을 잠깐 내렸다 올릴
    때마다 로그인 화면을 다시 만나 로그인 퍼널 분모에 재로그인을 섞는다(설계 §9-⑤).
  */
  trackAnalyticsEvent("auth_signed_out", { reason })
  try {
    await authService.signOut()
  } finally {
    /*
      익명 id 는 **기기 축이라 로그아웃해도 유지된다**(`analyticsClient` 머리말).
      그래서 로그아웃 뒤 이 기기에서 쌓인 익명 이벤트는, 다음에 로그인한 사람이
      누구든 서버의 소급 귀속으로 **그 사람에게 붙는다.** 공용 기기·계정 전환이
      섞인 데이터를 개인 단위로 읽으면 안 된다는 뜻이다.
    */
    resetAnalyticsIdentity()
    // 다음 소셜 로그인은 계정 선택부터 다시 — 그 표시까지 세션 정리가 함께 한다.
    await clearClientSession({ requireFreshSocialProviderSelection: true })
  }
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
  /*
    읽는 칸만 고른다. 셀렉터 없이 스토어를 통째로 구독하면 열 곳 남짓한 호출처가
    어느 칸이 바뀌어도 전부 렌더된다. 액션은 스토어에서 부를 때 꺼낸다 — 렌더와
    무관하고, 그래야 콜백 의존성도 비어 있다.
  */
  const {
    user,
    accountState,
    isLoading,
    isAuthenticated,
    requiresAdditionalInfo,
    entryGate,
    sessionPersistence,
  } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      accountState: state.accountState,
      isLoading: state.isLoading,
      isAuthenticated: state.isAuthenticated,
      requiresAdditionalInfo: state.requiresAdditionalInfo,
      entryGate: state.entryGate,
      sessionPersistence: state.sessionPersistence,
    })),
  )

  const applyAuthSession = useCallback((result: AuthSessionResult) => {
    useAuthStore.getState().applySession({
      user: result.user,
      accountState: result.accountState,
      requiresAdditionalInfo: result.requiresAdditionalInfo,
      entryGate: fallbackEntryGate(result),
      sessionPersistence: result.sessionPersistence ?? "persistent",
    })
  }, [])

  const startSessionRestore = useCallback(() => {
    return socialAuthCoordinator.startRestore({
      restore: (signal) => {
        trackAnalyticsEvent("auth_session_restore_started", {})
        return authService.restoreSession(signal)
      },
      apply: applyAuthSession,
      clearExpired: clearClientSession,
      onRetryableFailure: (error) => {
        trackAnalyticsEvent("auth_session_restore_failed", {})
        logger.debug("[useAuth] restore failed", error)
        // 서버에 닿지 못한 것만으로 안전 저장된 refresh token을 삭제하지 않는다.
        // 캐시와 사용자 상태는 비워 민감 데이터가 비인증 화면에 남지 않게 한다.
        clearClientSessionState()
      },
    })
  }, [applyAuthSession])

  useEffect(() => {
    void startSessionRestore()

    // 첫 부팅이 오프라인이었던 경우 토큰을 지우지 않고, 다시 활성화됐을 때 한 번 더
    // 복구한다. coordinator가 여러 useAuth 호출처의 요청을 한 발로 합친다.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void startSessionRestore()
    })
    return () => subscription.remove()
  }, [startSessionRestore])

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
      const result = await socialAuthCoordinator.runInteractive({
        native: () => nativeSocialSignIn(provider),
        // provider 토큰을 받기 전에는 기존 로그인 정보를 지우지 않는다. 사용자가
        // 카카오 창을 닫으면 원래 세션 복구가 재개돼야 한다.
        discardPreviousSession: clearClientSession,
        exchange: (socialResult) =>
          authService.signInWithSocial(
            socialResult.provider,
            socialResult.idToken,
            socialResult.email,
            socialResult.displayName,
          ),
      })
      logger.debug("[useAuth] social login 완료", {
        provider,
        accountState: isSocialSignupConsentRequiredResult(result)
          ? result.status
          : result.accountState,
      })
      // 네이티브 인증 Activity/세션이 앱으로 복귀한 직후 라우트를 바꾸면 Android의
      // native-stack 전환과 겹칠 수 있다. 기존 로그인 완료 경로만 기다리고 409 신규가입
      // 경로는 즉시 push 하던 비대칭을 없애 두 성공 갈래 모두 같은 안정화 시간을 둔다.
      await delay(SOCIAL_LOGIN_SUCCESS_TRANSITION_MS)
      if (isSocialSignupConsentRequiredResult(result)) {
        trackAnalyticsEvent("auth_signup_started", { method: "social" })
        return result
      }
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

  const sendSocialLinkEmailCode = (
    socialLinkToken: string,
    email: string,
    authAttemptId?: string,
  ) =>
    authService.sendSocialLinkEmailCode(socialLinkToken, email, authAttemptId)

  const verifySocialLinkEmailCode = async (
    socialLinkToken: string,
    email: string,
    code: string,
    authAttemptId?: string,
  ) => {
    const result = await authService.verifySocialLinkEmailCode(
      socialLinkToken,
      email,
      code,
      authAttemptId,
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

  const cancelWithdrawal = async (
    cancelToken: string,
    options?: { beforeSessionApply?: () => Promise<void> },
  ) => {
    const result = await authService.cancelWithdrawal(cancelToken)
    /*
      탈퇴 취소 확인창처럼 성공 즉시 화면이 바뀌는 호출부는 RN Modal 을 먼저 완전히
      내려야 한다. 세션을 먼저 적용하면 루트 가드의 replace 와 모달 dismiss 가 겹쳐
      iOS 에 투명한 전환 뷰가 남는다. API 실패 때는 콜백을 부르지 않으므로 확인창과
      취소 토큰을 그대로 보존해 재시도할 수 있다.
    */
    await options?.beforeSessionApply?.()
    applyAuthSession(result)
    trackAnalyticsEvent("auth_withdrawal_cancelled", {})
    return result
  }

  const signOut = useCallback(
    async (reason: AuthSignOutReason = "automatic"): Promise<void> => {
      if (!signOutInFlight) {
        signOutInFlight = runSignOut(reason).finally(() => {
          signOutInFlight = null
        })
      }
      return signOutInFlight
    },
    [],
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
