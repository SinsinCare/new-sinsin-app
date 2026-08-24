/* eslint-disable import/first -- auth service dependencies must be mocked before import. */
const mockPublicApi = { post: jest.fn() }
const mockTokenService = {
  getPersistedRefreshToken: jest.fn(),
  setTokens: jest.fn(),
}
const mockNativeSocialSignIn = jest.fn()
const mockCoreClearClientSession = jest.fn()
const mockDiscardClientSession = jest.fn()
const mockClearClientSessionState = jest.fn()
const mockAppStateListeners = new Set<(state: string) => void>()
const mockAuthState = {
  user: null,
  accountState: null,
  isLoading: false,
  isAuthenticated: false,
  requiresAdditionalInfo: false,
  entryGate: null,
  sessionPersistence: null,
  setUser: jest.fn(),
  setAccountState: jest.fn(),
  setRequiresAdditionalInfo: jest.fn(),
  setEntryGate: jest.fn(),
  setSessionPersistence: jest.fn(),
  reset: jest.fn(),
}

jest.mock("react", () => {
  const actual = jest.requireActual("react")
  const harness = jest.requireActual("./helpers/effectHookHarness")
  return {
    ...actual,
    useState: harness.useState,
    useRef: harness.useRef,
    useCallback: harness.useCallback,
    useMemo: harness.useMemo,
    useEffect: harness.useEffect,
  }
})
jest.mock("react-native", () => ({
  AppState: {
    addEventListener: jest.fn(
      (_type: string, listener: (state: string) => void) => {
        mockAppStateListeners.add(listener)
        return { remove: () => mockAppStateListeners.delete(listener) }
      },
    ),
  },
}))

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}))
jest.mock("../src/services/core", () => ({
  api: { get: jest.fn(), post: jest.fn() },
  clearClientSession: mockCoreClearClientSession,
  publicApi: mockPublicApi,
  tokenService: mockTokenService,
}))
jest.mock("../src/config/appConfig", () => ({ isMockUser: () => false }))
jest.mock("../src/lib/logger", () => ({
  logger: { debug: jest.fn(), error: jest.fn() },
}))
jest.mock("../src/services/auth/socialAuthService", () => ({
  signInWithSocialProvider: mockNativeSocialSignIn,
  isUserCancelledError: () => false,
}))
jest.mock("../src/services/core/sessionCleanup", () => ({
  clearClientSession: mockDiscardClientSession,
  clearClientSessionState: mockClearClientSessionState,
}))
jest.mock("../src/stores", () => ({
  useAuthStore: () => mockAuthState,
  useUserStore: () => ({ reset: jest.fn() }),
}))
jest.mock("../src/features/analytics", () => ({
  identifyAnalyticsUser: jest.fn(),
  resetAnalyticsIdentity: jest.fn(),
  trackAnalyticsEvent: jest.fn(),
}))
jest.mock("../src/lib/errorMessage", () => ({
  toAnalyticsFailKind: () => "unknown",
}))

import { authService } from "../src/services/auth/authService"
import { ApiError } from "../src/services/core/apiError"
import { createSocialAuthCoordinator } from "../src/services/auth/socialAuthCoordinator"
import type { AuthSessionResult } from "../src/services/types/serviceTypes"
import { useAuth } from "../src/hooks/useAuth"
import { renderHookWithEffects } from "./helpers/effectHookHarness"
/* eslint-enable import/first */

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}

const OLD_SESSION: AuthSessionResult = {
  user: { uid: "old-user", email: "old@example.com", displayName: "Old" },
  accountState: "ACTIVE",
  requiresAdditionalInfo: false,
  entryGate: "HOME",
  sessionPersistence: "persistent",
}

describe("session restore versus interactive social authentication", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAppStateListeners.clear()
    mockTokenService.getPersistedRefreshToken.mockResolvedValue("old-refresh")
    mockTokenService.setTokens.mockResolvedValue(undefined)
    mockCoreClearClientSession.mockResolvedValue(undefined)
    mockDiscardClientSession.mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("drains and invalidates an old restore before clearing and exchanging the provider token", async () => {
    const refreshResponse = deferred<{
      data: {
        result: {
          accessToken: string
          refreshToken: string
          accountState: string
          requiresAdditionalInfo: boolean
          user: { id: number; email: string; nickName: string }
        }
      }
    }>()
    mockPublicApi.post.mockReturnValueOnce(refreshResponse.promise)

    const coordinator = createSocialAuthCoordinator<AuthSessionResult>()
    const applyOldSession = jest.fn()
    const clearExpired = jest.fn(async () => undefined)
    const onRetryableFailure = jest.fn()
    const restoreOperations = {
      restore: (signal: AbortSignal) => authService.restoreSession(signal),
      apply: applyOldSession,
      clearExpired,
      onRetryableFailure,
    }
    const restoreAttempt = coordinator.startRestore(restoreOperations)
    await Promise.resolve()
    await Promise.resolve()
    expect(mockPublicApi.post).toHaveBeenCalledTimes(1)

    const discardPreviousSession = jest.fn(async () => undefined)
    const exchange = jest.fn(async () => ({
      status: "SOCIAL_CONSENT_REQUIRED" as const,
      provider: "kakao" as const,
      socialSignupToken: "new-signup-token",
    }))
    const interactive = coordinator.runInteractive({
      native: jest.fn(async () => ({
        provider: "kakao" as const,
        idToken: "new-provider-token",
      })),
      discardPreviousSession,
      exchange,
    })

    /*
      계약 정정(2026-08-25 리뷰): abort 신호는 **와이어를 자르지 않는다.**

      처음 이 테스트는 "요청에 aborted 신호가 실려 있다"와 "회전된 토큰을 저장하지
      않는다"를 정답으로 삼았는데, 그 계약이 조용한 영구 로그아웃이었다. 이 요청이
      서버에 닿는 순간 리프레시 회전은 시작이고(서버는 사용자당 refresh 한 행,
      compare-and-swap — 직전 토큰은 그 순간 죽는다), 연결을 끊거나 도착한 새
      토큰을 버리면 기기에는 방금 죽은 옛 토큰만 남는다. 사용자가 소셜 창을
      취소하면 finally 의 복구 재시작이 그 옛 토큰으로 401 → 세션 삭제.

      그래서 abort 가 막는 것은 **적용**(apply)뿐이다: 요청은 정산까지 가고,
      회전된 토큰은 저장한다(회전분은 저장에 관한 한 결코 낡은 값이 아니다).
    */
    const requestConfig = mockPublicApi.post.mock.calls[0]?.[2] as
      | { signal?: AbortSignal }
      | undefined
    expect(requestConfig?.signal).toBeUndefined()
    expect(coordinator.startRestore(restoreOperations)).toBeNull()

    refreshResponse.resolve({
      data: {
        result: {
          accessToken: "rotated-access",
          refreshToken: "rotated-refresh",
          accountState: "ACTIVE",
          requiresAdditionalInfo: false,
          user: { id: 7, email: "old@example.com", nickName: "Old" },
        },
      },
    })

    await restoreAttempt
    await expect(interactive).resolves.toMatchObject({
      status: "SOCIAL_CONSENT_REQUIRED",
      socialSignupToken: "new-signup-token",
    })
    expect(mockTokenService.setTokens).toHaveBeenCalledWith(
      "rotated-access",
      "rotated-refresh",
      "persistent",
    )
    expect(applyOldSession).not.toHaveBeenCalled()
    expect(clearExpired).not.toHaveBeenCalled()
    expect(onRetryableFailure).not.toHaveBeenCalled()
    expect(discardPreviousSession).toHaveBeenCalledTimes(1)
    expect(exchange).toHaveBeenCalledTimes(1)
    expect(discardPreviousSession.mock.invocationCallOrder[0]).toBeLessThan(
      exchange.mock.invocationCallOrder[0],
    )
  })

  it("preserves and resumes the old session when native provider selection is cancelled", async () => {
    const firstRestore = deferred<AuthSessionResult | null>()
    const secondRestore = deferred<AuthSessionResult | null>()
    const restore = jest
      .fn<Promise<AuthSessionResult | null>, [AbortSignal]>()
      .mockReturnValueOnce(firstRestore.promise)
      .mockReturnValueOnce(secondRestore.promise)
    const coordinator = createSocialAuthCoordinator<AuthSessionResult>()
    const operations = {
      restore,
      apply: jest.fn(),
      clearExpired: jest.fn(async () => undefined),
      onRetryableFailure: jest.fn(),
    }
    void coordinator.startRestore(operations)

    const discardPreviousSession = jest.fn(async () => undefined)
    const attempt = coordinator.runInteractive({
      native: jest.fn(async () => {
        throw Object.assign(new Error("cancelled"), { code: "Cancelled" })
      }),
      discardPreviousSession,
      exchange: jest.fn(),
    })
    firstRestore.resolve(OLD_SESSION)

    await expect(attempt).rejects.toMatchObject({ code: "Cancelled" })
    expect(discardPreviousSession).not.toHaveBeenCalled()
    expect(operations.apply).not.toHaveBeenCalled()
    expect(restore).toHaveBeenCalledTimes(2)
    expect(restore.mock.calls[0]?.[0].aborted).toBe(true)
    expect(restore.mock.calls[1]?.[0].aborted).toBe(false)
  })

  it("does not erase the previous session when an aborted restore delivers a late 401", async () => {
    const refreshResponse = deferred<never>()
    mockPublicApi.post.mockReturnValueOnce(refreshResponse.promise)
    const controller = new AbortController()

    const restore = authService.restoreSession(controller.signal)
    await Promise.resolve()
    await Promise.resolve()
    expect(mockPublicApi.post).toHaveBeenCalledTimes(1)

    controller.abort()
    refreshResponse.reject(
      new ApiError("expired", "AUTH_ERROR_001", 401, false),
    )

    await expect(restore).rejects.toMatchObject({
      name: "AbortError",
      code: "ERR_CANCELED",
    })
    expect(mockCoreClearClientSession).not.toHaveBeenCalled()
  })

  it("wires the actual useAuth hook so AppState restore cannot beat a Kakao 409", async () => {
    const staleRestore = deferred<AuthSessionResult | null>()
    const restoreSpy = jest
      .spyOn(authService, "restoreSession")
      .mockImplementation(() => staleRestore.promise)
    const exchangeSpy = jest
      .spyOn(authService, "signInWithSocial")
      .mockResolvedValue({
        status: "SOCIAL_CONSENT_REQUIRED",
        provider: "kakao",
        socialSignupToken: "fresh-signup-token",
      })
    mockNativeSocialSignIn.mockResolvedValue({
      provider: "kakao",
      idToken: "fresh-provider-token",
      email: null,
      displayName: null,
    })

    const hook = renderHookWithEffects(() => useAuth())
    expect(restoreSpy).toHaveBeenCalledTimes(1)

    const login = hook.result().signInWithSocialProvider("kakao")
    for (const listener of mockAppStateListeners) listener("active")
    expect(restoreSpy).toHaveBeenCalledTimes(1)

    staleRestore.resolve(OLD_SESSION)
    await expect(login).resolves.toEqual({
      status: "SOCIAL_CONSENT_REQUIRED",
      provider: "kakao",
      socialSignupToken: "fresh-signup-token",
    })

    expect(mockAuthState.setUser).not.toHaveBeenCalled()
    expect(mockAuthState.setAccountState).not.toHaveBeenCalled()
    expect(mockDiscardClientSession).toHaveBeenCalledTimes(1)
    expect(exchangeSpy).toHaveBeenCalledTimes(1)
    expect(mockDiscardClientSession.mock.invocationCallOrder[0]).toBeLessThan(
      exchangeSpy.mock.invocationCallOrder[0],
    )
    hook.unmount()
  })
})
