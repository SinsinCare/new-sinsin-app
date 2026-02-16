import { isMockUser } from "../../config/appConfig"
import { publicApi } from "../core/apiClient"
import type { ApiResponse, OtpVerifyResult } from "../../types"

interface EmailService {
  checkEmailAvailability(email: string): Promise<boolean>
  sendVerificationCode(email: string): Promise<void>
  verifyCode(
    email: string,
    code: string,
  ): Promise<{ verified: boolean; signupToken?: string }>
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

    async sendVerificationCode(email: string): Promise<void> {
      await publicApi.post<ApiResponse>("/auth/signup/email/otp/send", {
        email,
      })
    },

    async verifyCode(
      email: string,
      code: string,
    ): Promise<{ verified: boolean; signupToken?: string }> {
      try {
        const { data } = await publicApi.post<ApiResponse<OtpVerifyResult>>(
          "/auth/signup/email/otp/verify",
          { email, authKey: code },
        )
        return { verified: true, signupToken: data.result.signupToken }
      } catch {
        return { verified: false }
      }
    },
  }
}

function getMockEmailService(): EmailService {
  return {
    async checkEmailAvailability(_email: string): Promise<boolean> {
      return true
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
  sendVerificationCode: (email) =>
    getEmailService().sendVerificationCode(email),
  verifyCode: (email, code) => getEmailService().verifyCode(email, code),
}
