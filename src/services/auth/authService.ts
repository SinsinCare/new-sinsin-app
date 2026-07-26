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
  EntryGate,
  SessionPersistence,
} from "../../types"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { isMockUser } from "../../config/appConfig"
import { api, publicApi, tokenService } from "../core"
import { isApiErrorLike } from "../core/apiError"
import { logger } from "@/src/lib/logger"

const SOCIAL_REAUTHENTICATION_INTENT_KEY =
  "@sinsin/next-social-login-reauthentication"
const SOCIAL_REAUTHENTICATION_INTENT_VALUE = "required"

export type AuthSignOutReason = "automatic" | "explicit"

export async function persistSocialReauthenticationIntentForSignOut(
  _reason: AuthSignOutReason,
): Promise<void> {
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
  return (
    result.requiresAdditionalInfo ??
    result.user?.requiresAdditionalInfo ??
    false
  )
}

type AuthTokenResult = LoginResult | SignupResult | TokenRefreshResult

function getEntryGate(result: AuthTokenResult): EntryGate {
  if (
    result.entryGate === "HOME" ||
    result.entryGate === "PROFILE" ||
    result.entryGate === "ONBOARDING"
  ) {
    return result.entryGate
  }
  if (result.accountState === "PENDING_PROFILE") return "PROFILE"
  if (result.accountState === "PENDING_ONBOARDING") return "ONBOARDING"
  if (result.accountState === "ACTIVE" && getRequiresAdditionalInfo(result)) {
    return "PROFILE"
  }
  return "HOME"
}

function getSessionPersistence(result: AuthTokenResult): SessionPersistence {
  if (result.sessionPersistence === "ephemeral") return "ephemeral"
  if (result.sessionPersistence === "persistent") return "persistent"
  return getEntryGate(result) === "HOME" ? "persistent" : "ephemeral"
}

async function persistSessionTokens(result: AuthTokenResult): Promise<void> {
  await tokenService.setTokens(
    result.accessToken,
    result.refreshToken,
    getSessionPersistence(result),
  )
}

function toAuthSessionResult(
  result: AuthTokenResult,
  fallback: AppUser,
): AuthSessionResult {
  return {
    user: mapAuthUser(result.user, fallback),
    accountState: result.accountState,
    requiresAdditionalInfo: getRequiresAdditionalInfo(result),
    entryGate: getEntryGate(result),
    sessionPersistence: getSessionPersistence(result),
  }
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

      await persistSessionTokens(data.result)
      const fallback = {
        uid: email ?? provider,
        email: email ?? null,
        displayName: displayName ?? null,
      }

      logger.debug(
        "[authService] signInWithSocial 완료",
        data.result.accountState,
      )
      return toAuthSessionResult(data.result, fallback)
    },

    async signInWithEmail(
      email: string,
      password: string,
    ): Promise<AuthSessionResult> {
      const { data } = await publicApi.post<ApiResponse<LoginResult>>(
        "/auth/login",
        { email, password },
      )

      await persistSessionTokens(data.result)
      return toAuthSessionResult(data.result, {
        uid: email,
        email,
        displayName: null,
      })
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

      await persistSessionTokens(data.result)
      return toAuthSessionResult(data.result, {
        uid: email,
        email,
        displayName: null,
      })
    },

    async completeEmailLoginLink(
      emailLinkToken: string,
      password: string,
    ): Promise<AuthSessionResult> {
      const { data } = await publicApi.patch<ApiResponse<LoginResult>>(
        "/auth/signup/email-link/password",
        {
          emailLinkToken,
          password,
        },
      )

      await persistSessionTokens(data.result)
      return toAuthSessionResult(data.result, {
        uid: emailLinkToken,
        email: null,
        displayName: null,
      })
    },

    async completeProfile(
      request: ProfileCompleteRequest,
    ): Promise<AuthSessionResult> {
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
        entryGate:
          accountState === "PENDING_ONBOARDING"
            ? "ONBOARDING"
            : accountState === "PENDING_PROFILE" ||
                profile.requiresAdditionalInfo
              ? "PROFILE"
              : "HOME",
        sessionPersistence:
          accountState === "PENDING_ONBOARDING" ||
          accountState === "PENDING_PROFILE"
            ? "ephemeral"
            : "persistent",
      }
    },

    async getProfile(): Promise<AuthProfile> {
      const { data } = await api.get<ApiResponse<AuthProfile>>("/user/profile")
      return data.result
    },

    async signup(request: SignupRequest): Promise<AuthSessionResult> {
      const { data } = await publicApi.post<ApiResponse<SignupResult>>(
        "/auth/signup",
        request,
      )

      await persistSessionTokens(data.result)
      return toAuthSessionResult(data.result, {
        uid: request.signupToken,
        email: null,
        displayName: request.nickName,
      })
    },

    async completeSocialSignup(
      request: SocialSignupRequest,
    ): Promise<AuthSessionResult> {
      const { data } = await publicApi.post<ApiResponse<LoginResult>>(
        "/auth/social-signup",
        request,
      )

      await persistSessionTokens(data.result)
      return toAuthSessionResult(data.result, {
        uid: request.socialSignupToken,
        email: null,
        displayName: null,
      })
    },

    async cancelWithdrawal(cancelToken: string): Promise<AuthSessionResult> {
      const { data } = await publicApi.post<ApiResponse<LoginResult>>(
        "/auth/withdrawal/cancel",
        { cancelToken },
      )

      await persistSessionTokens(data.result)
      return toAuthSessionResult(data.result, {
        uid: "restored-user",
        email: null,
        displayName: null,
      })
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

    async promoteSession(): Promise<AuthSessionResult> {
      const refreshToken = await tokenService.getRefreshToken()
      if (!refreshToken) throw new Error("로그인 세션이 없습니다.")
      const { data } = await publicApi.post<ApiResponse<TokenRefreshResult>>(
        "/auth/tokens/refresh",
        { refreshToken },
      )
      await persistSessionTokens(data.result)
      return toAuthSessionResult(data.result, {
        uid: "restored-user",
        email: null,
        displayName: null,
      })
    },

    async restoreSession(): Promise<AuthSessionResult | null> {
      const refreshToken = await tokenService.getPersistedRefreshToken()
      if (!refreshToken) return null

      try {
        const { data } = await publicApi.post<ApiResponse<TokenRefreshResult>>(
          "/auth/tokens/refresh",
          { refreshToken },
        )

        await persistSessionTokens(data.result)
        return toAuthSessionResult(data.result, {
          uid: "restored-user",
          email: null,
          displayName: null,
        })
      } catch (error) {
        logger.debug("[authService] restoreSession failed", error)
        throw error
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
  promoteSession: () => getAuthService().promoteSession(),
  restoreSession: () => getAuthService().restoreSession(),
}
