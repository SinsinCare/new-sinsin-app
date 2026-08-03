import { useState } from "react"
import Toast from "react-native-toast-message"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/src/hooks/useAuth"
import { presentError } from "@/src/lib/errorMessage"
import type { SocialProvider, WithdrawalPendingResult } from "@/src/types"
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

  const loginWithProvider = async (provider: SocialProvider) => {
    if (socialLoading) return

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
          },
        })
      }
    } catch (error) {
      const action = getSocialLoginErrorAction(
        error,
        provider,
        isUserCancelledError,
      )
      if (action.type === "cancelled") return
      if (action.type === "withdrawal_pending") {
        setWithdrawalPending(action.result)
        return
      }
      if (action.type === "provider_email_required") {
        Toast.show({
          type: "error",
          text1: action.title,
          text2: action.message,
          visibilityTime: 7000,
        })
        return
      }
      if (action.type === "legacy_social_link_required") {
        router.push({
          pathname: "./social-link-email",
          params: {
            provider: action.provider,
            socialLinkToken: action.socialLinkToken,
          },
        })
        return
      }

      /* 위 갈래에 걸리지 않은 실패. 예전에는 전부 "로그인 정보를 확인하지 못했어요"
         한 줄이었는데, 그 자리에 오는 것은 확인이 덜 끝난 소셜 토큰(`AUTH_ERROR_002`,
         다시 누르면 된다)·지원하지 않는 방식(`AUTH_ERROR_003`)·정지된 계정
         (`AUTH_ERROR_007`)이라 사용자가 할 일이 서로 다르다. */
      presentError(error, {
        scope: `social-login-${provider}`,
        retry: () => void loginWithProvider(provider),
      })
    } finally {
      setSocialLoading(false)
      setCurrentProvider(null)
    }
  }

  const confirmWithdrawalCancellation = async () => {
    if (!withdrawalPending || isCancellingWithdrawal) return

    setIsCancellingWithdrawal(true)
    try {
      await cancelWithdrawal(withdrawalPending.cancelToken)
      setWithdrawalPending(null)
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
