import type {
  IAuthService,
  AppUser,
  AuthSessionResult,
} from "../types/serviceTypes"
import type {
  SignupRequest,
  ApiResponse,
  LoginResult,
  ProfileCompleteRequest,
  ProfileCompleteResult,
  SignupResult,
  TokenRefreshResult,
  AuthUserSummary,
  AuthProfile,
  SocialProvider,
  SocialSignupConsentRequiredResult,
  SocialSignupRequest,
} from "../../types"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { isMockUser } from "../../config/appConfig"
import { api, clearClientSession, publicApi, tokenService } from "../core"
import { isApiErrorLike } from "../core/apiError"
import { logger } from "@/src/lib/logger"

const SOCIAL_REAUTHENTICATION_INTENT_KEY =
  "@sinsin/next-social-login-reauthentication"
const SOCIAL_REAUTHENTICATION_INTENT_VALUE = "required"

export type AuthSignOutReason = "automatic" | "explicit"

export async function persistSocialReauthenticationIntentForSignOut(
  reason: AuthSignOutReason,
): Promise<void> {
  if (reason !== "explicit") return
  await AsyncStorage.setItem(
    SOCIAL_REAUTHENTICATION_INTENT_KEY,
    SOCIAL_REAUTHENTICATION_INTENT_VALUE,
  )
}

export async function isSocialReauthenticationRequired(): Promise<boolean> {
  return (
    (await AsyncStorage.getItem(SOCIAL_REAUTHENTICATION_INTENT_KEY)) ===
    SOCIAL_REAUTHENTICATION_INTENT_VALUE
  )
}

export async function consumeSocialReauthenticationIntent(): Promise<void> {
  await AsyncStorage.removeItem(SOCIAL_REAUTHENTICATION_INTENT_KEY)
}

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

function getRequiresAdditionalInfo(result: {
  requiresAdditionalInfo?: boolean
  user?: { requiresAdditionalInfo?: boolean }
}) {
  return result.requiresAdditionalInfo ?? result.user?.requiresAdditionalInfo ?? false
}

function isSocialProvider(value: unknown): value is SocialProvider {
  return value === "google" || value === "apple" || value === "kakao"
}

const SOCIAL_CONSENT_REQUIRED_CODES = new Set([
  "SOCIAL_CONSENT_REQUIRED",
  "AUTH_ERROR_011",
])

function getSocialSignupConsentRequiredResult(
  code: string | undefined,
  result: unknown,
  fallbackProvider?: SocialProvider,
): SocialSignupConsentRequiredResult | null {
  if (!code || !SOCIAL_CONSENT_REQUIRED_CODES.has(code)) return null
  if (!result || typeof result !== "object") return null

  const payload = result as {
    provider?: unknown
    socialSignupToken?: unknown
  }
  const provider = isSocialProvider(payload.provider)
    ? payload.provider
    : fallbackProvider
  if (
    !provider ||
    typeof payload.socialSignupToken !== "string" ||
    payload.socialSignupToken.length === 0
  ) {
    return null
  }

  return {
    status: "SOCIAL_CONSENT_REQUIRED",
    provider,
    socialSignupToken: payload.socialSignupToken,
  }
}

function getSocialSignupConsentRequiredFromError(
  error: unknown,
  fallbackProvider?: SocialProvider,
): SocialSignupConsentRequiredResult | null {
  if (!isApiErrorLike(error)) return null
  return getSocialSignupConsentRequiredResult(
    error.code,
    error.result,
    fallbackProvider,
  )
}

function getRealAuthService(): IAuthService {
  return {
    async signInWithSocial(
      provider: SocialProvider,
      idToken: string,
      email?: string | null,
      displayName?: string | null,
    ) {
      logger.debug("[authService] signInWithSocial 시작", provider, {
        idTokenLength: idToken?.length,
        idTokenPrefix: idToken?.slice(0, 30),
      })

      let data: ApiResponse<LoginResult> | null = null
      try {
        const response = await publicApi.post<
          ApiResponse<LoginResult | SocialSignupConsentRequiredResult>
        >("/auth/social-login", { provider, idToken })
        const responseData = response.data
        const consentRequired = getSocialSignupConsentRequiredResult(
          responseData.code,
          responseData.result,
          provider,
        )
        if (consentRequired) {
          logger.debug("[authService] social signup consent required", provider)
          return consentRequired
        }
        data = responseData as ApiResponse<LoginResult>
        logger.debug(
          "[authService] social login 응답",
          response.status,
          data.result.accountState,
        )
      } catch (error: unknown) {
        const consentRequired = getSocialSignupConsentRequiredFromError(
          error,
          provider,
        )
        if (consentRequired) {
          logger.debug("[authService] social signup consent required", provider)
          return consentRequired
        }

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

      if (!data) {
        throw new Error("소셜 로그인 응답을 확인할 수 없습니다.")
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
      return {
        user,
        accountState,
        requiresAdditionalInfo: getRequiresAdditionalInfo(data.result),
      }
    },

    async signInWithEmail(
      email: string,
      password: string,
    ): Promise<{
      user: AppUser
      accountState: string
      requiresAdditionalInfo: boolean
    }> {
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

      return {
        user,
        accountState,
        requiresAdditionalInfo: getRequiresAdditionalInfo(data.result),
      }
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
    ) {
      let data: ApiResponse<LoginResult> | null = null
      try {
        const response = await publicApi.post<
          ApiResponse<LoginResult | SocialSignupConsentRequiredResult>
        >("/auth/social-link/email/otp/verify", {
          socialLinkToken,
          email,
          authKey: code,
        })
        const responseData = response.data
        const consentRequired = getSocialSignupConsentRequiredResult(
          responseData.code,
          responseData.result,
        )
        if (consentRequired) return consentRequired
        data = responseData as ApiResponse<LoginResult>
      } catch (error: unknown) {
        const consentRequired = getSocialSignupConsentRequiredFromError(error)
        if (consentRequired) return consentRequired
        throw error
      }

      if (!data) {
        throw new Error("소셜 이메일 인증 응답을 확인할 수 없습니다.")
      }

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

      return {
        user,
        accountState,
        requiresAdditionalInfo: getRequiresAdditionalInfo(data.result),
      }
    },

    async completeEmailLoginLink(
      emailLinkToken: string,
      password: string,
    ): Promise<{
      user: AppUser
      accountState: string
      requiresAdditionalInfo: boolean
    }> {
      const { data } = await publicApi.patch<ApiResponse<LoginResult>>(
        "/auth/signup/email-link/password",
        {
          emailLinkToken,
          password,
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
        uid: emailLinkToken,
        email: authUser.email,
        displayName: authUser.nickName || authUser.name || null,
      })

      return {
        user,
        accountState,
        requiresAdditionalInfo: getRequiresAdditionalInfo(data.result),
      }
    },

    async completeProfile(
      request: ProfileCompleteRequest,
    ): Promise<{
      user: AppUser
      accountState: string
      requiresAdditionalInfo: boolean
    }> {
      const { data } = await api.post<ApiResponse<ProfileCompleteResult>>(
        "/user/profile/complete",
        request,
      )

      const { accountState, profile } = data.result
      const user: AppUser = {
        uid: String(profile.userId),
        email: profile.email || null,
        displayName: profile.nickName || profile.name || null,
      }

      return {
        user,
        accountState,
        requiresAdditionalInfo: profile.requiresAdditionalInfo,
      }
    },

    async getProfile(): Promise<AuthProfile> {
      const { data } = await api.get<ApiResponse<AuthProfile>>("/user/profile")
      return data.result
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

    async completeSocialSignup(
      request: SocialSignupRequest,
    ): Promise<AuthSessionResult> {
      const { data } = await publicApi.post<ApiResponse<LoginResult>>(
        "/auth/social-signup",
        request,
      )

      const {
        accessToken,
        refreshToken,
        accountState,
        user: authUser,
      } = data.result
      await tokenService.setTokens(accessToken, refreshToken)

      const user = mapAuthUser(authUser, {
        uid: request.socialSignupToken,
        email: null,
        displayName: null,
      })

      return {
        user,
        accountState,
        requiresAdditionalInfo: getRequiresAdditionalInfo(data.result),
      }
    },

    async cancelWithdrawal(
      cancelToken: string,
    ): Promise<{
      user: AppUser
      accountState: string
      requiresAdditionalInfo: boolean
    }> {
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

      return {
        user,
        accountState,
        requiresAdditionalInfo: getRequiresAdditionalInfo(data.result),
      }
    },

    async signOut(): Promise<void> {
      const accessToken = await tokenService.getAccessToken()
      if (!accessToken) return

      try {
        await publicApi.post<ApiResponse>("/auth/logout", undefined, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      } catch (error) {
        logger.debug("[authService] logout revoke failed", error)
      }
    },

    async restoreSession(): Promise<{
      user: AppUser
      accountState: string
      requiresAdditionalInfo: boolean
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

        return {
          user,
          accountState,
          requiresAdditionalInfo: getRequiresAdditionalInfo(data.result),
        }
      } catch (error) {
        if (
          isApiErrorLike(error) &&
          (error.statusCode === 401 || error.statusCode === 403)
        ) {
          await clearClientSession()
          return null
        }
        logger.debug("[authService] restoreSession failed", error)
        await clearClientSession()
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
  completeEmailLoginLink: (emailLinkToken, password) =>
    getAuthService().completeEmailLoginLink(emailLinkToken, password),
  completeProfile: (request) => getAuthService().completeProfile(request),
  getProfile: () => getAuthService().getProfile(),
  signup: (request) => getAuthService().signup(request),
  completeSocialSignup: (request) =>
    getAuthService().completeSocialSignup(request),
  cancelWithdrawal: (cancelToken) =>
    getAuthService().cancelWithdrawal(cancelToken),
  signOut: () => getAuthService().signOut(),
  restoreSession: () => getAuthService().restoreSession(),
}
