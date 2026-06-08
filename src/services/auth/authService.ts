import type { IAuthService, AppUser } from "../types/serviceTypes"
import type {
  SignupRequest,
  ApiResponse,
  LoginResult,
  SignupResult,
  TokenRefreshResult,
  AuthUserSummary,
} from "../../types"
import { isMockUser } from "../../config/appConfig"
import { publicApi, tokenService } from "../core"
import { ApiError } from "../core/apiError"
import { logger } from "@/src/lib/logger"

function mapAuthUser(
  user: AuthUserSummary | undefined,
  fallback: AppUser,
): AppUser {
  if (!user) return fallback
  return {
    uid: String(user.id),
    email: user.email,
    displayName: user.nickName || user.name || null,
  }
}

function getRealAuthService(): IAuthService {
  return {
    async signInWithSocial(
      provider: "google" | "apple" | "kakao",
      idToken: string,
      email?: string | null,
      displayName?: string | null,
    ): Promise<{ user: AppUser; accountState: string }> {
      logger.debug("[authService] signInWithSocial 시작", provider, {
        idTokenLength: idToken?.length,
        idTokenPrefix: idToken?.slice(0, 30),
      })

      let data
      try {
        const response = await publicApi.post<ApiResponse<LoginResult>>(
          "/auth/social-login",
          { provider, idToken },
        )
        data = response.data
        logger.debug(
          "[authService] social login 응답",
          response.status,
          data.result.accountState,
        )
      } catch (error: unknown) {
        if (
          error !== null &&
          typeof error === "object" &&
          "isAxiosError" in error
        ) {
          const axErr = error as {
            isAxiosError: boolean
            message: string
            response?: { status: number }
            request?: unknown
            config?: { url?: string; method?: string }
          }
          logger.debug("[authService] social login 실패", {
            isAxiosError: axErr.isAxiosError,
            message: axErr.message,
            method: axErr.config?.method,
            url: axErr.config?.url,
            status: axErr.response?.status,
            hasRequest: !!axErr.request,
          })
        } else if (error instanceof Error) {
          logger.debug("[authService] social login 실패", error.message)
        } else {
          logger.debug("[authService] social login 실패", "unknown error")
        }
        throw error
      }

      const {
        accessToken,
        refreshToken,
        accountState,
        user: authUser,
      } = data.result
      await tokenService.setTokens(accessToken, refreshToken)

      const user = mapAuthUser(authUser, {
        uid: email ?? provider,
        email: email ?? null,
        displayName: displayName ?? null,
      })

      logger.debug("[authService] signInWithSocial 완료", accountState)
      return { user, accountState }
    },

    async signInWithEmail(
      email: string,
      password: string,
    ): Promise<{ user: AppUser; accountState: string }> {
      const { data } = await publicApi.post<ApiResponse<LoginResult>>(
        "/auth/login",
        { email, password },
      )

      const {
        accessToken,
        refreshToken,
        accountState,
        user: authUser,
      } = data.result
      await tokenService.setTokens(accessToken, refreshToken)

      const user = mapAuthUser(authUser, {
        uid: email,
        email,
        displayName: null,
      })

      return { user, accountState }
    },

    async sendSocialLinkEmailCode(
      socialLinkToken: string,
      email: string,
    ): Promise<void> {
      await publicApi.post<ApiResponse>("/auth/social-link/email/otp/send", {
        socialLinkToken,
        email,
      })
    },

    async verifySocialLinkEmailCode(
      socialLinkToken: string,
      email: string,
      code: string,
    ): Promise<{ user: AppUser; accountState: string }> {
      const { data } = await publicApi.post<ApiResponse<LoginResult>>(
        "/auth/social-link/email/otp/verify",
        {
          socialLinkToken,
          email,
          authKey: code,
        },
      )

      const {
        accessToken,
        refreshToken,
        accountState,
        user: authUser,
      } = data.result
      await tokenService.setTokens(accessToken, refreshToken)

      const user = mapAuthUser(authUser, {
        uid: email,
        email,
        displayName: null,
      })

      return { user, accountState }
    },

    async signup(request: SignupRequest): Promise<AppUser> {
      const { data } = await publicApi.post<ApiResponse<SignupResult>>(
        "/auth/signup",
        request,
      )

      const { accessToken, refreshToken, user: authUser } = data.result
      await tokenService.setTokens(accessToken, refreshToken)

      const user = mapAuthUser(authUser, {
        uid: request.signupToken,
        email: null,
        displayName: request.nickName,
      })

      return user
    },

    async cancelWithdrawal(
      cancelToken: string,
    ): Promise<{ user: AppUser; accountState: string }> {
      const { data } = await publicApi.post<ApiResponse<LoginResult>>(
        "/auth/withdrawal/cancel",
        { cancelToken },
      )

      const {
        accessToken,
        refreshToken,
        accountState,
        user: authUser,
      } = data.result
      await tokenService.setTokens(accessToken, refreshToken)

      const user = mapAuthUser(authUser, {
        uid: "restored-user",
        email: null,
        displayName: null,
      })

      return { user, accountState }
    },

    async signOut(): Promise<void> {
      await tokenService.clearTokens()
    },

    async restoreSession(): Promise<{
      user: AppUser
      accountState: string
    } | null> {
      const refreshToken = await tokenService.getRefreshToken()
      if (!refreshToken) return null

      try {
        const { data } = await publicApi.post<ApiResponse<TokenRefreshResult>>(
          "/auth/tokens/refresh",
          { refreshToken },
        )

        const {
          accessToken,
          refreshToken: newRefreshToken,
          accountState,
          user: authUser,
        } = data.result
        await tokenService.setTokens(accessToken, newRefreshToken)

        const user = mapAuthUser(authUser, {
          uid: "restored-user",
          email: null,
          displayName: null,
        })

        return { user, accountState }
      } catch (error) {
        // 401(인증 만료/무효) 또는 403(차단된 계정 상태)일 때 토큰 삭제
        // 네트워크 오류 등 일시적 에러는 토큰 유지 → 다음 실행 시 재시도
        if (
          error instanceof ApiError &&
          (error.statusCode === 401 || error.statusCode === 403)
        ) {
          await tokenService.clearTokens()
        }
        return null
      }
    },
  }
}

let cachedService: IAuthService | null = null

function getAuthService(): IAuthService {
  if (cachedService) return cachedService

  if (isMockUser()) {
    const { mockAuthService } = require("./mock") // eslint-disable-line @typescript-eslint/no-require-imports
    cachedService = mockAuthService
  } else {
    cachedService = getRealAuthService()
  }

  return cachedService!
}

export const authService: IAuthService = {
  signInWithEmail: (email, password) =>
    getAuthService().signInWithEmail(email, password),
  signInWithSocial: (provider, idToken, email, displayName) =>
    getAuthService().signInWithSocial(provider, idToken, email, displayName),
  sendSocialLinkEmailCode: (socialLinkToken, email) =>
    getAuthService().sendSocialLinkEmailCode(socialLinkToken, email),
  verifySocialLinkEmailCode: (socialLinkToken, email, code) =>
    getAuthService().verifySocialLinkEmailCode(socialLinkToken, email, code),
  signup: (request) => getAuthService().signup(request),
  cancelWithdrawal: (cancelToken) =>
    getAuthService().cancelWithdrawal(cancelToken),
  signOut: () => getAuthService().signOut(),
  restoreSession: () => getAuthService().restoreSession(),
}
