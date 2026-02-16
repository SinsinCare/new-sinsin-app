import type { IAuthService, AppUser } from "../types/serviceTypes"
import type {
  SignupRequest,
  ApiResponse,
  LoginResult,
  SignupResult,
  TokenRefreshResult,
} from "../../types"
import { isMockUser } from "../../config/appConfig"
import { publicApi } from "@/src/services"
import { tokenService } from "@/src/services"

function getRealAuthService(): IAuthService {
  return {
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
      } catch {
        await tokenService.clearTokens()
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
  signup: (request) => getAuthService().signup(request),
  signOut: () => getAuthService().signOut(),
  restoreSession: () => getAuthService().restoreSession(),
}
