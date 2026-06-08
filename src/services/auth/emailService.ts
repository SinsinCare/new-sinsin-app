import { isMockUser } from "../../config/appConfig"
import { publicApi } from "../core/apiClient"
import { ApiError } from "../core/apiError"
import type {
  ApiResponse,
  EmailLoginLinkOtpVerifyResult,
  EmailLoginLinkRequiredResult,
  OtpVerifyResult,
} from "../../types"

type SignupEmailCheckResult =
  | { status: "available" }
  | { status: "duplicate"; message: string }
  | ({ status: "email_login_link_required" } & EmailLoginLinkRequiredResult)

interface EmailService {
  checkEmailAvailability(email: string): Promise<boolean>
  checkSignupEmail(email: string): Promise<SignupEmailCheckResult>
  sendVerificationCode(email: string): Promise<void>
  verifyCode(
    email: string,
    code: string,
  ): Promise<{ verified: boolean; signupToken?: string }>
  resendVerificationCode(email: string): Promise<void>
  sendPasswordResetCode(email: string): Promise<void>
  verifyPasswordResetCode(
    email: string,
    code: string,
  ): Promise<{ verified: boolean; resetToken?: string }>
  sendEmailLoginLinkCode(email: string): Promise<void>
  verifyEmailLoginLinkCode(
    email: string,
    code: string,
  ): Promise<{ verified: boolean; emailLinkToken?: string }>
}

function getEmailLoginLinkRequiredResult(
  error: unknown,
): EmailLoginLinkRequiredResult | null {
  if (!(error instanceof ApiError) || error.code !== "AUTH_ERROR_009") {
    return null
  }
  const result = error.result
  if (!result || typeof result !== "object") return null
  const { email, providers } = result as Partial<EmailLoginLinkRequiredResult>
  if (
    typeof email === "string" &&
    Array.isArray(providers) &&
    providers.every(
      (provider) =>
        provider === "google" || provider === "apple" || provider === "kakao",
    )
  ) {
    return { email, providers }
  }
  return null
}

function getRealEmailService(): EmailService {
  return {
    async checkEmailAvailability(email: string): Promise<boolean> {
      try {
        await publicApi.get<ApiResponse>("/auth/signup/email/verify", {
          params: { email },
        })
        return true
      } catch {
        return false
      }
    },

    async checkSignupEmail(email: string): Promise<SignupEmailCheckResult> {
      try {
        await publicApi.get<ApiResponse>("/auth/signup/email/verify", {
          params: { email },
        })
        return { status: "available" }
      } catch (error) {
        const linkRequired = getEmailLoginLinkRequiredResult(error)
        if (linkRequired) {
          return { status: "email_login_link_required", ...linkRequired }
        }
        if (error instanceof ApiError && error.code === "SIGNUP_ERROR_001") {
          return {
            status: "duplicate",
            message: error.message,
          }
        }
        throw error
      }
    },

    async sendVerificationCode(email: string): Promise<void> {
      await publicApi.post<ApiResponse>("/auth/signup/email/otp/send", {
        email,
      })
    },

    async verifyCode(
      email: string,
      code: string,
    ): Promise<{ verified: boolean; signupToken?: string }> {
      const { data } = await publicApi.post<ApiResponse<OtpVerifyResult>>(
        "/auth/signup/email/otp/verify",
        { email, authKey: code },
      )
      return { verified: true, signupToken: data.result.signupToken }
    },

    async resendVerificationCode(email: string): Promise<void> {
      await publicApi.post<ApiResponse>("/auth/signup/email/otp/send", {
        email,
      })
    },

    async sendPasswordResetCode(email: string): Promise<void> {
      await publicApi.post<ApiResponse>("/auth/password/email/otp/send", {
        email,
      })
    },

    async verifyPasswordResetCode(
      email: string,
      code: string,
    ): Promise<{ verified: boolean; resetToken?: string }> {
      const { data } = await publicApi.post<
        ApiResponse<{ resetToken: string }>
      >("/auth/password/email/otp/verify", { email, authKey: code })
      return { verified: true, resetToken: data.result.resetToken }
    },

    async sendEmailLoginLinkCode(email: string): Promise<void> {
      await publicApi.post<ApiResponse>("/auth/signup/email-link/otp/send", {
        email,
      })
    },

    async verifyEmailLoginLinkCode(
      email: string,
      code: string,
    ): Promise<{ verified: boolean; emailLinkToken?: string }> {
      const { data } = await publicApi.post<
        ApiResponse<EmailLoginLinkOtpVerifyResult>
      >("/auth/signup/email-link/otp/verify", { email, authKey: code })
      return {
        verified: true,
        emailLinkToken: data.result.emailLinkToken,
      }
    },
  }
}

function getMockEmailService(): EmailService {
  return {
    async checkEmailAvailability(_email: string): Promise<boolean> {
      return true
    },

    async checkSignupEmail(_email: string): Promise<SignupEmailCheckResult> {
      return { status: "available" }
    },

    async sendVerificationCode(_email: string): Promise<void> {
      // mock: 아무것도 하지 않음
    },

    async verifyCode(
      _email: string,
      _code: string,
    ): Promise<{ verified: boolean; signupToken?: string }> {
      return { verified: true, signupToken: "mock-signup-token" }
    },

    async resendVerificationCode(_email: string): Promise<void> {
      // mock: 아무것도 하지 않음
    },

    async sendPasswordResetCode(_email: string): Promise<void> {
      // mock: 아무것도 하지 않음
    },

    async verifyPasswordResetCode(
      _email: string,
      _code: string,
    ): Promise<{ verified: boolean; resetToken?: string }> {
      return { verified: true, resetToken: "mock-reset-token" }
    },

    async sendEmailLoginLinkCode(_email: string): Promise<void> {
      // mock: 아무것도 하지 않음
    },

    async verifyEmailLoginLinkCode(
      _email: string,
      _code: string,
    ): Promise<{ verified: boolean; emailLinkToken?: string }> {
      return { verified: true, emailLinkToken: "mock-email-link-token" }
    },
  }
}

let cachedService: EmailService | null = null

function getEmailService(): EmailService {
  if (cachedService) return cachedService
  cachedService = isMockUser() ? getMockEmailService() : getRealEmailService()
  return cachedService
}

export const emailService: EmailService = {
  checkEmailAvailability: (email) =>
    getEmailService().checkEmailAvailability(email),
  checkSignupEmail: (email) => getEmailService().checkSignupEmail(email),
  sendVerificationCode: (email) =>
    getEmailService().sendVerificationCode(email),
  verifyCode: (email, code) => getEmailService().verifyCode(email, code),
  resendVerificationCode: (email) =>
    getEmailService().resendVerificationCode(email),
  sendPasswordResetCode: (email) =>
    getEmailService().sendPasswordResetCode(email),
  verifyPasswordResetCode: (email, code) =>
    getEmailService().verifyPasswordResetCode(email, code),
  sendEmailLoginLinkCode: (email) =>
    getEmailService().sendEmailLoginLinkCode(email),
  verifyEmailLoginLinkCode: (email, code) =>
    getEmailService().verifyEmailLoginLinkCode(email, code),
}
