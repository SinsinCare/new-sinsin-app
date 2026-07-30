import { useState } from "react"
import Toast from "react-native-toast-message"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import i18n from "@/src/i18n"
import { useAuth } from "@/src/hooks/useAuth"
import { logger } from "@/src/lib/logger"
import { isApiErrorLike } from "@/src/services/core/apiError"
import type { SocialProvider, WithdrawalPendingResult } from "@/src/types"
import {
  getSocialLoginErrorAction,
  getSocialLoginSuccessAction,
} from "../utils/socialLoginFlow"

function getDebugMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error) return error
  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }
  return i18n.t("social.debugFallback", { ns: "auth" })
}

/**
 * 원인을 알 수 없는 로그인 오류의 사용자 문구. 디버그 메시지를 그대로 내보내지
 * 않는다 — 에러 메시지의 역할은 상황 보고가 아니라 다음 행동 안내다.
 * (구체적 원인이 있는 케이스는 socialLoginFlow 의 action 이 먼저 가져간다.)
 */
function getUserFacingLoginError(error: unknown): {
  title: string
  message: string
} {
  if (isApiErrorLike(error) && error.isNetworkError) {
    return {
      title: i18n.t("login.failedTitle", { ns: "auth" }),
      message: i18n.t("login.networkError", { ns: "auth" }),
    }
  }
  return {
    title: i18n.t("login.failedTitle", { ns: "auth" }),
    message: i18n.t("login.failedGeneric", { ns: "auth" }),
  }
}

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

      logger.debug("[useSocialLogin] social login error", {
        provider,
        message: getDebugMessage(error),
      })
      const friendly = getUserFacingLoginError(error)
      Toast.show({
        type: "error",
        text1: friendly.title,
        text2: friendly.message,
        visibilityTime: 5000,
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
      logger.debug("[useSocialLogin] withdrawal cancel error", {
        message: getDebugMessage(error),
      })
      Toast.show({
        type: "error",
        text1: t("withdrawal.cancelFailedTitle"),
        text2: t("withdrawal.cancelFailedDetail"),
        visibilityTime: 5000,
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
