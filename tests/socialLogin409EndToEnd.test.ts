/* eslint-disable import/first -- jest mocks must be installed before the real modules load. */
const mockTokenService = {
  getAccessToken: jest.fn(),
  getPersistedRefreshToken: jest.fn(),
  setTokens: jest.fn(),
  clearTokens: jest.fn(),
}
const mockClearClientSession = jest.fn()
const mockSignInWithSocialProvider = jest.fn()

jest.mock("react", () => {
  const actual = jest.requireActual("react")
  const harness = jest.requireActual("./helpers/hookHarness")
  return {
    ...actual,
    useState: harness.useState,
    useRef: harness.useRef,
    useCallback: harness.useCallback,
    useMemo: harness.useMemo,
  }
})

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}))

jest.mock("../src/config/appConfig", () => ({
  getBackendUrl: () => "https://test.invalid/api/v1",
  isMockUser: () => false,
}))

jest.mock("../src/i18n", () => ({ getAppLanguage: () => "ko" }))
jest.mock("../src/services/errorService", () => ({ reportError: jest.fn() }))
jest.mock("../src/services/core/tokenService", () => ({
  tokenService: mockTokenService,
}))
jest.mock("../src/services/core/authSession", () => ({
  createSessionExpiredError: jest.fn(),
  refreshAccessToken: jest.fn(),
}))
jest.mock("../src/services/core/sessionCleanup", () => ({
  clearClientSession: mockClearClientSession,
  clearClientSessionOn401: jest.fn(),
  clearClientSessionState: jest.fn(),
}))
jest.mock("../src/services/core", () => {
  const realApiClient = jest.requireActual("../src/services/core/apiClient")
  return {
    api: realApiClient.api,
    publicApi: realApiClient.publicApi,
    clearClientSession: mockClearClientSession,
    tokenService: mockTokenService,
  }
})

jest.mock("../src/lib/logger", () => ({
  logger: { debug: jest.fn(), error: jest.fn() },
}))
jest.mock("../src/lib/errorMessage", () => ({ presentError: jest.fn() }))
jest.mock("../src/features/analytics", () => ({
  trackAnalyticsEvent: jest.fn(),
}))
jest.mock("../src/shared/components/appModalGate", () => ({
  afterModalTransitions: jest.fn(async () => undefined),
}))
jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn() },
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
  /*
    재포커스 래치 해제(useSocialLogin)용. setup.ts 전역 목과 같은 의미 — **같은
    콜백은 한 번만** 부른다. 매 렌더 다시 부르면 setState 재렌더마다 래치가 풀려
    이 스위트의 이중 탭 단정이 무의미해진다(실물 포커스 이펙트는 재렌더에 다시
    돌지 않는다).
  */
  useFocusEffect: (() => {
    const seen = new WeakSet<object>()
    return (callback: () => void) => {
      if (seen.has(callback)) return
      seen.add(callback)
      callback()
    }
  })(),
}))
jest.mock("../src/hooks/useAuth", () => ({
  useAuth: () => ({
    signInWithSocialProvider: mockSignInWithSocialProvider,
    cancelWithdrawal: jest.fn(),
    isUserCancelledError: () => false,
  }),
}))

import { AxiosError, type AxiosAdapter } from "axios"
import { authService } from "../src/services/auth/authService"
import { publicApi } from "../src/services/core/apiClient"
import { useSocialLogin } from "../src/features/auth/hooks/useSocialLogin"
import { renderHookSync } from "./helpers/hookHarness"
import { router } from "expo-router"
/* eslint-enable import/first */

describe("raw Bun 409 to social terms navigation", () => {
  const originalAdapter = publicApi.defaults.adapter

  beforeEach(() => {
    jest.clearAllMocks()
    mockTokenService.setTokens.mockResolvedValue(undefined)
    mockClearClientSession.mockResolvedValue(undefined)
    mockSignInWithSocialProvider.mockImplementation((provider) =>
      authService.signInWithSocial(provider, "kakao-access-token"),
    )
  })

  afterEach(() => {
    publicApi.defaults.adapter = originalAdapter
  })

  it("passes a raw Axios 409 through the interceptor and pushes one exact route under a double tap", async () => {
    const adapter = jest.fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>(
      async (config) => {
        const response = {
          config,
          status: 409,
          statusText: "Conflict",
          headers: {},
          data: {
            isSuccess: false,
            code: "AUTH_ERROR_011",
            message: "소셜 회원가입 동의가 필요합니다.",
            result: {
              provider: "kakao",
              socialSignupToken: "signup-token-from-bun",
            },
          },
        }
        throw new AxiosError(
          "Request failed with status code 409",
          "ERR_BAD_REQUEST",
          config,
          undefined,
          response,
        )
      },
    )
    publicApi.defaults.adapter = adapter

    const hook = renderHookSync(() => useSocialLogin())
    const sameCapturedHandler = hook.result().loginWithProvider
    const first = sameCapturedHandler("kakao")
    const second = sameCapturedHandler("kakao")
    await Promise.all([first, second])

    expect(adapter).toHaveBeenCalledTimes(1)
    const requestAttemptId =
      adapter.mock.calls[0]?.[0].headers.get("X-Auth-Attempt-Id")
    expect(requestAttemptId).toMatch(/^[0-9a-f-]{36}$/u)
    expect(mockSignInWithSocialProvider).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/(auth)/terms-agreement",
      params: {
        mode: "social",
        provider: "kakao",
        socialSignupToken: "signup-token-from-bun",
        authAttemptId: requestAttemptId,
      },
    })
    expect(mockTokenService.setTokens).not.toHaveBeenCalled()
    expect(hook.result().socialLoading).toBe(false)
  })
})
