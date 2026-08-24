import { useCallback, useRef, useState } from "react"
import Toast from "react-native-toast-message"
import { router, useFocusEffect } from "expo-router"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/src/hooks/useAuth"
import { presentError } from "@/src/lib/errorMessage"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import type { SocialProvider, WithdrawalPendingResult } from "@/src/types"
import { afterModalTransitions } from "@/src/shared/components/appModalGate"
import {
  getSocialLoginErrorAction,
  getSocialLoginSuccessAction,
} from "../utils/socialLoginFlow"

export function useSocialLogin() {
  const { t } = useTranslation("auth")
  const { signInWithSocialProvider, cancelWithdrawal, isUserCancelledError } =
    useAuth()
  const [socialLoading, setSocialLoading] = useState(false)
  const [currentProvider, setCurrentProvider] = useState<SocialProvider | null>(
    null,
  )
  const [withdrawalPending, setWithdrawalPending] =
    useState<WithdrawalPendingResult | null>(null)
  const [isCancellingWithdrawal, setIsCancellingWithdrawal] = useState(false)
  const socialLoginInFlightRef = useRef(false)

  /*
    내비게이션이 시도를 가져간 갈래(409 약관 동의 push·이메일 연결 push·세션 적용)는
    래치를 잠근 채 떠난다 — 그 화면이 흐름을 잇는 동안 뒤늦은 두 번째 탭이 새 시도를
    겹치지 않게. 그런데 push 는 이 화면을 언마운트하지 않으므로, 사용자가 위 화면에서
    **뒤로 돌아오면** 잠긴 래치가 그대로 살아 소셜 버튼 전부가 조용히 죽는다
    (2026-08-25 리뷰 적발: 카카오 신규계정 409 → 약관 → 뒤로 → 어떤 소셜 버튼도
    무반응, 스피너도 없음, 앱 재시작 전까지 — 사용자가 보고한 "카카오 로그인이 안
    된다"의 재생산이다).

    이 화면이 내비게이션 포커스를 되찾았다는 것은 위 화면이 흐름을 끝냈거나 사용자가
    포기했다는 뜻이므로 그 순간 래치를 푼다. 카카오 커스텀 탭·구글 시트가 떠 있는
    동안은 라우터 포커스가 바뀌지 않으므로(앱 상태만 background) 진행 중인 같은 화면
    시도를 여기서 풀어 버리는 일은 없다.
  */
  useFocusEffect(
    useCallback(() => {
      socialLoginInFlightRef.current = false
    }, []),
  )

  const loginWithProvider = async (provider: SocialProvider) => {
    // 같은 render에서 잡힌 onPress가 React commit 전에 두 번 호출돼도 한 번만 들어간다.
    if (socialLoginInFlightRef.current) return
    socialLoginInFlightRef.current = true
    let navigationOwnsAttempt = false

    setSocialLoading(true)
    setCurrentProvider(provider)
    try {
      const result = await signInWithSocialProvider(provider)
      const action = getSocialLoginSuccessAction(result)
      if (action.type === "consent_required") {
        router.push({
          pathname: "/(auth)/terms-agreement",
          params: {
            mode: "social",
            provider: action.provider,
            socialSignupToken: action.socialSignupToken,
            ...(action.authAttemptId
              ? { authAttemptId: action.authAttemptId }
              : {}),
          },
        })
        navigationOwnsAttempt = true
      } else {
        // 기존 계정 로그인은 useAuth가 이미 세션을 적용해 루트 가드가 화면을 넘긴다.
        navigationOwnsAttempt = true
      }
    } catch (error) {
      const action = getSocialLoginErrorAction(
        error,
        provider,
        isUserCancelledError,
      )
      /* 취소는 여기서 세지 않는다 — `useAuth` 의 catch 가 이미
         `auth_social_login_cancelled` 로 갈라 놓았다(그쪽이 유일하게 배타적인 자리다). */
      if (action.type === "cancelled") return
      if (action.type === "withdrawal_pending") {
        /* 이 갈래에는 `auth_social_login_blocked` 를 쏘지 않는다. 바로 다음 줄이
           탈퇴 확인 모달을 띄우므로 같은 사건이 두 이름으로 세어지고, 그러면
           '소셜 막힘' 총량과 '탈퇴 모달 노출' 총량이 서로를 중복 포함한다
           (설계 §J1-0 정정 3). 이 갈래의 정본은 아래 한 이름이다. */
        trackAnalyticsEvent("auth_withdrawal_prompt_viewed", {
          source: "social",
        })
        setWithdrawalPending(action.result)
        return
      }
      if (action.type === "provider_email_required") {
        trackAnalyticsEvent("auth_social_login_blocked", {
          provider,
          fail_kind: "provider_email_required",
        })
        Toast.show({
          type: "error",
          text1: action.title,
          text2: action.message,
          visibilityTime: 7000,
        })
        return
      }
      if (action.type === "social_link_required") {
        trackAnalyticsEvent("auth_social_login_blocked", {
          provider,
          fail_kind: "link_required",
        })
        router.push({
          pathname: "./social-link-email",
          params: {
            provider: action.provider,
            socialLinkToken: action.socialLinkToken,
            ...(action.authAttemptId
              ? { authAttemptId: action.authAttemptId }
              : {}),
          },
        })
        navigationOwnsAttempt = true
        return
      }

      /* 위 갈래에 걸리지 않은 실패. 예전에는 전부 "로그인 정보를 확인하지 못했어요"
         한 줄이었는데, 그 자리에 오는 것은 확인이 덜 끝난 소셜 토큰(`AUTH_ERROR_002`,
         다시 누르면 된다)·지원하지 않는 방식(`AUTH_ERROR_003`)·정지된 계정
         (`AUTH_ERROR_007`)이라 사용자가 할 일이 서로 다르다. */
      trackAnalyticsEvent("auth_social_login_blocked", {
        provider,
        fail_kind: "generic",
      })
      presentError(error, {
        scope: `social-login-${provider}`,
        retry: () => void loginWithProvider(provider),
      })
    } finally {
      if (!navigationOwnsAttempt) socialLoginInFlightRef.current = false
      setSocialLoading(false)
      setCurrentProvider(null)
    }
  }

  const confirmWithdrawalCancellation = async () => {
    if (!withdrawalPending || isCancellingWithdrawal) return

    setIsCancellingWithdrawal(true)
    try {
      await cancelWithdrawal(withdrawalPending.cancelToken, {
        beforeSessionApply: async () => {
          setWithdrawalPending(null)
          await afterModalTransitions()
        },
      })
    } catch (error) {
      // 취소 토큰은 아직 손에 있다(모달을 닫지 않았다). 다시 시도가 실제로 같은
      // 동작을 다시 하는 자리다.
      presentError(error, {
        scope: "withdrawal-cancel-social",
        retry: () => void confirmWithdrawalCancellation(),
      })
    } finally {
      setIsCancellingWithdrawal(false)
    }
  }

  return {
    socialLoading,
    socialLoadingMessage: currentProvider
      ? t("social.loadingProvider", {
          provider: t(
            currentProvider === "google"
              ? "social.providerGoogle"
              : currentProvider === "apple"
                ? "social.providerApple"
                : "social.providerKakao",
          ),
        })
      : t("social.loading"),
    withdrawalPending,
    isCancellingWithdrawal,
    loginWithProvider,
    confirmWithdrawalCancellation,
    dismissWithdrawalPending: () => setWithdrawalPending(null),
  }
}
