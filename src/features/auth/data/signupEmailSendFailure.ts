import i18n from "@/src/i18n"
import type { EmailLoginLinkRequiredResult, SocialProvider } from "@/src/types"

export type SignupEmailSendFailure =
  | { status: "duplicate"; message: string }
  | ({ status: "email_login_link_required" } & EmailLoginLinkRequiredResult)

function isSocialProvider(value: unknown): value is SocialProvider {
  return value === "google" || value === "apple" || value === "kakao"
}

export function mapSignupEmailSendFailure(
  error: unknown,
): SignupEmailSendFailure | null {
  if (!error || typeof error !== "object") return null

  const { code, message, result } = error as {
    code?: unknown
    message?: unknown
    result?: unknown
  }

  if (code === "SIGNUP_ERROR_001") {
    return {
      status: "duplicate",
      message:
        typeof message === "string"
          ? message
          : i18n.t("emailVerification.cannotSend", { ns: "auth" }),
    }
  }

  if (code !== "AUTH_ERROR_009" || !result || typeof result !== "object") {
    return null
  }

  const { email, providers } = result as {
    email?: unknown
    providers?: unknown
  }
  if (
    typeof email !== "string" ||
    !Array.isArray(providers) ||
    !providers.every(isSocialProvider)
  ) {
    return null
  }

  return {
    status: "email_login_link_required",
    email,
    providers,
  }
}
