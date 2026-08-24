import i18n from "@/src/i18n"
import { isApiErrorLike } from "@/src/services/core/apiError"
import { normalizeAuthAttemptId } from "@/src/services/auth/authAttemptId"
import type {
  SocialProvider,
  SocialSignupConsentRequiredResult,
  WithdrawalPendingResult,
} from "@/src/types"
import type { AuthSessionResult } from "@/src/services/types/serviceTypes"
import { getWithdrawalPendingResult } from "./withdrawalPending"

const SOCIAL_LINK_REQUIRED_CODES = new Set([
  "AUTH_ERROR_004",
  "SOCIAL_EMAIL_NOT_FOUND",
])

const PROVIDER_EMAIL_GUIDANCE_KEYS = {
  google: {
    title: "social.googleEmailTitle",
    message: "social.googleEmailMessage",
  },
  apple: {
    title: "social.appleEmailTitle",
    message: "social.appleEmailMessage",
  },
  kakao: {
    title: "social.kakaoEmailTitle",
    message: "social.kakaoEmailMessage",
  },
} as const satisfies Record<SocialProvider, { title: string; message: string }>

type SocialLoginResult = AuthSessionResult | SocialSignupConsentRequiredResult

export type SocialLoginSuccessAction =
  | { type: "completed" }
  | {
      type: "consent_required"
      provider: SocialProvider
      socialSignupToken: string
      authAttemptId?: string
    }

export type SocialLoginErrorAction =
  | { type: "cancelled" }
  | { type: "withdrawal_pending"; result: WithdrawalPendingResult }
  | {
      type: "provider_email_required"
      provider: SocialProvider
      title: string
      message: string
    }
  | {
      type: "social_link_required"
      provider: SocialProvider
      socialLinkToken: string
      authAttemptId?: string
    }
  | { type: "generic" }

function isSocialProvider(value: unknown): value is SocialProvider {
  return value === "google" || value === "apple" || value === "kakao"
}

function getErrorResult(error: unknown): Record<string, unknown> | null {
  if (!isApiErrorLike(error)) return null
  if (!error.result || typeof error.result !== "object") return null
  return error.result as Record<string, unknown>
}

function getProviderEmailRequiredAction(
  error: unknown,
  requestedProvider: SocialProvider,
): SocialLoginErrorAction | null {
  const result = getErrorResult(error)
  if (!result) return null

  const isProviderEmailRequired =
    result.reason === "PROVIDER_EMAIL_REQUIRED" ||
    result.providerEmailRequired === true
  if (!isProviderEmailRequired) return null

  const provider = isSocialProvider(result.provider)
    ? result.provider
    : requestedProvider
  const guidanceKeys = PROVIDER_EMAIL_GUIDANCE_KEYS[provider]
  return {
    type: "provider_email_required",
    provider,
    title: i18n.t(guidanceKeys.title, { ns: "auth" }),
    message: i18n.t(guidanceKeys.message, { ns: "auth" }),
  }
}

function getSocialLinkRequiredAction(
  error: unknown,
): SocialLoginErrorAction | null {
  if (!isApiErrorLike(error) || !SOCIAL_LINK_REQUIRED_CODES.has(error.code)) {
    return null
  }

  const result = getErrorResult(error)
  if (!result) return null
  const { provider, socialLinkToken } = result
  const authAttemptId = normalizeAuthAttemptId(result.authAttemptId)
  if (
    isSocialProvider(provider) &&
    typeof socialLinkToken === "string" &&
    socialLinkToken.length > 0
  ) {
    return {
      type: "social_link_required",
      provider,
      socialLinkToken,
      ...(authAttemptId ? { authAttemptId } : {}),
    }
  }
  return null
}

export function getSocialLoginSuccessAction(
  result: SocialLoginResult,
): SocialLoginSuccessAction {
  if ("status" in result && result.status === "SOCIAL_CONSENT_REQUIRED") {
    return {
      type: "consent_required",
      provider: result.provider,
      socialSignupToken: result.socialSignupToken,
      ...(result.authAttemptId ? { authAttemptId: result.authAttemptId } : {}),
    }
  }
  return { type: "completed" }
}

export function getSocialLoginErrorAction(
  error: unknown,
  requestedProvider: SocialProvider,
  isUserCancelledError: (error: unknown) => boolean,
): SocialLoginErrorAction {
  if (isUserCancelledError(error)) return { type: "cancelled" }

  const withdrawalPending = getWithdrawalPendingResult(error)
  if (withdrawalPending) {
    return { type: "withdrawal_pending", result: withdrawalPending }
  }

  // Bun은 이메일을 받지 못한 경우에도 사용자가 직접 이메일을 인증할 수 있는
  // socialLinkToken 을 준다. 이 토큰을 안내 토스트보다 먼저 소비해야 복구 화면으로
  // 이어진다. 토큰이 없거나 깨졌을 때만 제공자별 안내를 안전한 폴백으로 쓴다.
  const socialLinkRequired = getSocialLinkRequiredAction(error)
  if (socialLinkRequired) return socialLinkRequired

  const providerEmailRequired = getProviderEmailRequiredAction(
    error,
    requestedProvider,
  )
  if (providerEmailRequired) return providerEmailRequired

  return { type: "generic" }
}
