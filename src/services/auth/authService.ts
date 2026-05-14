import type { IAuthService, AppUser } from "../types/serviceTypes"
import type {
  SignupRequest,
  ApiResponse,
  LoginResult,
  SignupResult,
  TokenRefreshResult,
} from "../../types"
import { isMockUser } from "../../config/appConfig"
import { publicApi, tokenService } from "../core"
import { ApiError } from "../core/apiError"
import { logger } from "@/src/lib/logger"

function getRealAuthService(): IAuthService {
  return {
    async signInWithSocial(
      provider: "google" | "apple" | "kakao",
      idToken: string,
      email?: string | null,
      displayName?: string | null,
    ): Promise<{ user: AppUser; accountState: string }> {
      console.log("[authService] ─── signInWithSocial 진입 ───")
      console.log("[authService] provider:", provider)
      console.log("[authService] idToken 앞 8자:", idToken?.slice(0, 8) + "…")
      console.log("[authService] idToken 길이:", idToken?.length)
      console.log("[authService] email:", email)

      let data
      try {
        console.log("[authService] POST /auth/social-login 요청")
        const response = await publicApi.post<ApiResponse<LoginResult>>(
          "/auth/social-login",
          { provider, idToken },
        )
        console.log("[authService] HTTP status:", response.status)
        console.log("[authService] 응답 isSuccess:", response.data?.isSuccess)
        console.log("[authService] 응답 code:", response.data?.code)
        data = response.data
        console.log("[authService] accountState:", data.result.accountState)
      } catch (error: unknown) {
        console.error("[authService] POST /auth/social-login 실패")
        if (error !== null && typeof error === "object" && "isAxiosError" in error) {
          const axErr = error as {
            isAxiosError: boolean
            message: string
            response?: { status: number; data: unknown; headers: unknown }
            request?: unknown
            config?: { url?: string; baseURL?: string; method?: string }
          }
          console.error("[authService] Axios 에러 여부:", axErr.isAxiosError)
          console.error("[authService] message:", axErr.message)
          console.error("[authService] config.url:", axErr.config?.url)
          console.error("[authService] config.baseURL:", axErr.config?.baseURL)
          console.error("[authService] config.method:", axErr.config?.method)
          if (axErr.response) {
            console.error("[authService] HTTP status:", axErr.response.status)
            console.error("[authService] 응답 body:", JSON.stringify(axErr.response.data, null, 2))
          } else if (axErr.request) {
            console.error("[authService] 응답 없음 (네트워크 오류 or 타임아웃)")
          }
        } else if (error instanceof Error) {
          console.error("[authService] Error message:", error.message)
          console.error("[authService] stack:", error.stack)
        } else {
          console.error("[authService] 알 수 없는 에러:", JSON.stringify(error))
        }
        logger.error("[authService] /auth/social-login 실패", error)
        throw error
      }

      const { accessToken, refreshToken, accountState } = data.result
      console.log("[authService] 토큰 저장 중... accessToken 앞 8자:", accessToken?.slice(0, 8) + "…")
      await tokenService.setTokens(accessToken, refreshToken)
      console.log("[authService] 토큰 저장 완료")

      const user: AppUser = {
        uid: email ?? provider,
        email: email ?? null,
        displayName: displayName ?? null,
      }

      console.log("[authService] ─── signInWithSocial 완료:", accountState, "───")
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

      const { accessToken, refreshToken, accountState } = data.result
      await tokenService.setTokens(accessToken, refreshToken)

      const user: AppUser = {
        uid: email,
        email,
        displayName: null,
      }

      return { user, accountState }
    },

    async signup(request: SignupRequest): Promise<AppUser> {
      const { data } = await publicApi.post<ApiResponse<SignupResult>>(
        "/auth/signup",
        request,
      )

      const { accessToken, refreshToken } = data.result
      await tokenService.setTokens(accessToken, refreshToken)

      const user: AppUser = {
        uid: request.signupToken,
        email: null,
        displayName: request.nickName,
      }

      return user
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
        } = data.result
        await tokenService.setTokens(accessToken, newRefreshToken)

        const user: AppUser = {
          uid: "restored-user",
          email: null,
          displayName: null,
        }

        return { user, accountState }
      } catch (error) {
        // 401(인증 만료/무효)일 때만 토큰 삭제
        // 네트워크 오류 등 일시적 에러는 토큰 유지 → 다음 실행 시 재시도
        if (error instanceof ApiError && error.statusCode === 401) {
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
  signup: (request) => getAuthService().signup(request),
  signOut: () => getAuthService().signOut(),
  restoreSession: () => getAuthService().restoreSession(),
}
