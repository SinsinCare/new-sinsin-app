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
import { api, clearClientSession, publicApi, tokenService } from "../core"
import { isApiErrorLike } from "../core/apiError"
import { logger } from "@/src/lib/logger"
import { authAttemptRequestConfig, createAuthAttemptId } from "./authAttemptId"

const SOCIAL_REAUTHENTICATION_INTENT_KEY =
  "@sinsin/next-social-login-reauthentication"
const SOCIAL_REAUTHENTICATION_INTENT_VALUE = "required"
const SOCIAL_LINK_REQUIRED_CODES = new Set([
  "AUTH_ERROR_004",
  "SOCIAL_EMAIL_NOT_FOUND",
])

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

function throwIfRestoreWasCancelled(signal?: AbortSignal): void {
  if (!signal?.aborted) return
  throw Object.assign(new Error("session restore was cancelled"), {
    name: "AbortError",
    code: "ERR_CANCELED",
  })
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
  authAttemptId?: string,
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
    ...(authAttemptId ? { authAttemptId } : {}),
  }
}

function getSocialSignupConsentRequiredFromError(
  error: unknown,
  fallbackProvider?: SocialProvider,
  authAttemptId?: string,
): SocialSignupConsentRequiredResult | null {
  if (!isApiErrorLike(error)) return null
  return getSocialSignupConsentRequiredResult(
    error.code,
    error.result,
    fallbackProvider,
    authAttemptId,
  )
}

function attachAuthAttemptIdToSocialLinkError(
  error: unknown,
  authAttemptId: string,
): unknown {
  if (!isApiErrorLike(error) || !SOCIAL_LINK_REQUIRED_CODES.has(error.code)) {
    return error
  }
  if (!error.result || typeof error.result !== "object") return error
  error.result = {
    ...(error.result as Record<string, unknown>),
    authAttemptId,
  }
  return error
}

function getRealAuthService(): IAuthService {
  return {
    async signInWithSocial(
      provider: SocialProvider,
      idToken: string,
      email?: string | null,
      displayName?: string | null,
    ) {
      const authAttemptId = createAuthAttemptId()
      logger.debug("[authService] signInWithSocial 시작", provider, {
        hasIdToken: idToken.length > 0,
      })

      let data: ApiResponse<LoginResult> | null = null
      try {
        const response = await publicApi.post<
          ApiResponse<LoginResult | SocialSignupConsentRequiredResult>
        >(
          "/auth/social-login",
          { provider, idToken },
          authAttemptRequestConfig(authAttemptId),
        )
        const responseData = response.data
        const consentRequired = getSocialSignupConsentRequiredResult(
          responseData.code,
          responseData.result,
          provider,
          authAttemptId,
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
          authAttemptId,
        )
        if (consentRequired) {
          logger.debug("[authService] social signup consent required", provider)
          return consentRequired
        }

        const correlatedError = attachAuthAttemptIdToSocialLinkError(
          error,
          authAttemptId,
        )
        if (
          correlatedError !== null &&
          typeof correlatedError === "object" &&
          "isAxiosError" in correlatedError
        ) {
          const axErr = correlatedError as {
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
        } else if (correlatedError instanceof Error) {
          logger.debug(
            "[authService] social login 실패",
            correlatedError.message,
          )
        } else {
          logger.debug("[authService] social login 실패", "unknown error")
        }
        throw correlatedError
      }

      if (!data) {
        throw new Error(
          "로그인 정보를 확인하지 못했어요. 다시 로그인해 주세요.",
        )
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
      authAttemptId?: string,
    ): Promise<void> {
      await publicApi.post<ApiResponse>(
        "/auth/social-link/email/otp/send",
        { socialLinkToken, email },
        authAttemptRequestConfig(authAttemptId),
      )
    },

    async verifySocialLinkEmailCode(
      socialLinkToken: string,
      email: string,
      code: string,
      authAttemptId?: string,
    ) {
      let data: ApiResponse<LoginResult> | null = null
      try {
        const response = await publicApi.post<
          ApiResponse<LoginResult | SocialSignupConsentRequiredResult>
        >(
          "/auth/social-link/email/otp/verify",
          { socialLinkToken, email, authKey: code },
          authAttemptRequestConfig(authAttemptId),
        )
        const responseData = response.data
        const consentRequired = getSocialSignupConsentRequiredResult(
          responseData.code,
          responseData.result,
          undefined,
          authAttemptId,
        )
        if (consentRequired) return consentRequired
        data = responseData as ApiResponse<LoginResult>
      } catch (error: unknown) {
        const consentRequired = getSocialSignupConsentRequiredFromError(
          error,
          undefined,
          authAttemptId,
        )
        if (consentRequired) return consentRequired
        throw error
      }

      if (!data) {
        throw new Error(
          "이메일 인증 결과를 확인하지 못했어요. 인증번호를 다시 받아 주세요.",
        )
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
      authAttemptId?: string,
    ): Promise<AuthSessionResult> {
      const { data } = await publicApi.post<ApiResponse<LoginResult>>(
        "/auth/social-signup",
        request,
        authAttemptRequestConfig(authAttemptId),
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
      if (!refreshToken) {
        throw new Error("로그인이 만료됐어요. 다시 로그인해 주세요.")
      }
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

    async restoreSession(
      signal?: AbortSignal,
    ): Promise<AuthSessionResult | null> {
      throwIfRestoreWasCancelled(signal)
      const refreshToken = await tokenService.getPersistedRefreshToken()
      if (!refreshToken) return null

      try {
        throwIfRestoreWasCancelled(signal)
        /*
          abort 신호를 **와이어에는 걸지 않는다** — 판정은 응답 도착 뒤에 한다.

          이 요청이 서버에 닿는 순간 리프레시 회전은 이미 시작이다: 서버는 단일
          compare-and-swap 회전이라(sinsin-be-bun auth service — "직전 토큰은 그
          순간 죽는다", refresh_token 은 사용자당 한 행) 응답을 받든 못 받든 옛
          토큰은 죽는다. 여기서 연결을 끊으면 새 토큰이 전선 위에서 유실되고,
          기기에 남는 것은 방금 죽은 옛 토큰뿐이다. 그 상태에서 사용자가 소셜
          창을 취소하면 finally 가 복구를 재시작 → 401 → 세션 삭제 — "복구 중
          소셜 버튼을 탭했다가 취소하면 조용히 로그아웃"(2026-08-25 리뷰).
          dispatch 전 취소는 위 throwIfRestoreWasCancelled 가 이미 막았으므로
          (회전 시작 전 = 자르기에 안전한 유일한 지점), 여기부터는 정산까지 간다.
        */
        const { data } = await publicApi.post<ApiResponse<TokenRefreshResult>>(
          "/auth/tokens/refresh",
          { refreshToken },
        )

        /*
          회전된 토큰은 저장에 관한 한 결코 "낡은 값"이 아니다 — abort 됐어도
          저장한다. abort 가 막아야 하는 것은 **세션 적용**(interactive 로그인과의
          화면 경합)뿐이므로 취소 판정은 저장 뒤로 미룬다.

          단, 클라이언트 CAS 하나는 지킨다: 이 복구가 떠 있는 동안 interactive
          로그인이 이미 새 세션을 저장했다면(저장된 리프레시가 이 요청에 쓴 값과
          다르다) 그쪽이 더 최신이므로 덮어쓰지 않는다 — 서버는 사용자당 한 행이라
          늦게 온 이 회전분을 얹으면 방금 로그인한 세션을 도로 죽인다.
        */
        const storedRefreshToken = await tokenService.getPersistedRefreshToken()
        if (storedRefreshToken === refreshToken) {
          await persistSessionTokens(data.result)
        }
        throwIfRestoreWasCancelled(signal)
        return toAuthSessionResult(data.result, {
          uid: "restored-user",
          email: null,
          displayName: null,
        })
      } catch (error) {
        // interactive 소셜 로그인이 이 복구를 중단한 뒤 401/403 응답이 늦게 도착할 수
        // 있다. 그 응답은 이미 폐기된 시도의 결과이므로, 이전 세션을 지우는 근거로
        // 쓰면 안 된다. 특히 네이티브 로그인 취소 시에는 보존한 세션을 다시 복구해야
        // 하므로 abort 판정을 인증 오류 처리보다 반드시 먼저 한다.
        throwIfRestoreWasCancelled(signal)
        if (
          isApiErrorLike(error) &&
          (error.statusCode === 401 || error.statusCode === 403)
        ) {
          await clearClientSession({
            requireFreshSocialProviderSelection: true,
          })
          return null
        }
        logger.debug("[authService] restoreSession failed", error)
        // 오프라인·timeout·5xx는 토큰이 무효라는 증거가 아니다. 여기서 지우면
        // 잠깐의 통신 장애가 영구 로그아웃이 된다. 호출자가 비인증 화면으로 안전하게
        // 내리되 다음 실행에서 복구할 수 있도록 오류를 전달한다.
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
  sendSocialLinkEmailCode: (socialLinkToken, email, authAttemptId) =>
    getAuthService().sendSocialLinkEmailCode(
      socialLinkToken,
      email,
      authAttemptId,
    ),
  verifySocialLinkEmailCode: (socialLinkToken, email, code, authAttemptId) =>
    getAuthService().verifySocialLinkEmailCode(
      socialLinkToken,
      email,
      code,
      authAttemptId,
    ),
  completeEmailLoginLink: (emailLinkToken, password) =>
    getAuthService().completeEmailLoginLink(emailLinkToken, password),
  completeProfile: (request) => getAuthService().completeProfile(request),
  getProfile: () => getAuthService().getProfile(),
  signup: (request) => getAuthService().signup(request),
  completeSocialSignup: (request, authAttemptId) =>
    getAuthService().completeSocialSignup(request, authAttemptId),
  cancelWithdrawal: (cancelToken) =>
    getAuthService().cancelWithdrawal(cancelToken),
  signOut: () => getAuthService().signOut(),
  promoteSession: () => getAuthService().promoteSession(),
  restoreSession: (signal) => getAuthService().restoreSession(signal),
}
