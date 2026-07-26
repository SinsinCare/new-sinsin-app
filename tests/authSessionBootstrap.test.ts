/* eslint-disable import/first */
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}
const mockPublicApi = {
  post: jest.fn(),
}
const mockTokenService = {
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  getPersistedRefreshToken: jest.fn(),
  setTokens: jest.fn(),
}
const mockClearClientSession = jest.fn()

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: mockAsyncStorage,
}))

jest.mock("../src/services/core", () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  publicApi: mockPublicApi,
  tokenService: mockTokenService,
  clearClientSession: mockClearClientSession,
}))

jest.mock("../src/config/appConfig", () => ({
  isMockUser: jest.fn(() => false),
}))

jest.mock("../src/lib/logger", () => ({
  logger: { debug: jest.fn(), error: jest.fn() },
}))

import { bootstrapAuthSession } from "../src/features/auth/utils/authSessionBootstrap"
import { authService } from "../src/services/auth/authService"
import { ApiError } from "../src/services/core/apiError"
import type { AuthSessionResult } from "../src/services/types/serviceTypes"

/* eslint-enable import/first */

const restoredSession: AuthSessionResult = {
  user: {
    uid: "restored-user",
    email: null,
    displayName: null,
  },
  accountState: "ACTIVE",
  requiresAdditionalInfo: false,
  entryGate: "HOME",
  sessionPersistence: "persistent",
}

describe("bootstrapAuthSession", () => {
  it("does not restore again when an active session already exists", async () => {
    const restoreSession = jest.fn()
    const applyAuthSession = jest.fn()
    const clearClientSession = jest.fn()

    await expect(
      bootstrapAuthSession({
        isAuthenticated: () => true,
        restoreSession,
        applyAuthSession,
        clearClientSession,
      }),
    ).resolves.toBe("already_authenticated")

    expect(restoreSession).not.toHaveBeenCalled()
    expect(applyAuthSession).not.toHaveBeenCalled()
    expect(clearClientSession).not.toHaveBeenCalled()
  })

  it("preserves an interactive login completed while a stale restore is in flight", async () => {
    let authenticated = false
    const applyAuthSession = jest.fn()
    const clearClientSession = jest.fn()
    let finishRestore: ((result: AuthSessionResult | null) => void) | undefined
    const restoreSession = new Promise<AuthSessionResult | null>((resolve) => {
      finishRestore = resolve
    })

    const bootstrap = bootstrapAuthSession({
      isAuthenticated: () => authenticated,
      restoreSession: () => restoreSession,
      applyAuthSession,
      clearClientSession,
    })

    authenticated = true
    finishRestore?.(restoredSession)

    await expect(bootstrap).resolves.toBe("preserved_active_session")

    expect(applyAuthSession).not.toHaveBeenCalled()
    expect(clearClientSession).not.toHaveBeenCalled()
  })

  it("applies a restored session when no newer login exists", async () => {
    const applyAuthSession = jest.fn()
    const clearClientSession = jest.fn()

    await expect(
      bootstrapAuthSession({
        isAuthenticated: () => false,
        restoreSession: async () => restoredSession,
        applyAuthSession,
        clearClientSession,
      }),
    ).resolves.toBe("restored")

    expect(applyAuthSession).toHaveBeenCalledWith(restoredSession)
    expect(clearClientSession).not.toHaveBeenCalled()
  })

  it("clears a missing persisted session when still signed out", async () => {
    const applyAuthSession = jest.fn()
    const clearClientSession = jest.fn().mockResolvedValue(undefined)

    await expect(
      bootstrapAuthSession({
        isAuthenticated: () => false,
        restoreSession: async () => null,
        applyAuthSession,
        clearClientSession,
      }),
    ).resolves.toBe("cleared")

    expect(applyAuthSession).not.toHaveBeenCalled()
    expect(clearClientSession).toHaveBeenCalledTimes(1)
  })
})

describe("authService.restoreSession", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTokenService.getPersistedRefreshToken.mockResolvedValue(null)
    mockTokenService.getRefreshToken.mockResolvedValue(null)
    mockTokenService.setTokens.mockResolvedValue(undefined)
    mockClearClientSession.mockResolvedValue(undefined)
  })

  it("refreshes only a persisted refresh token and applies a persistent session", async () => {
    mockTokenService.getPersistedRefreshToken.mockResolvedValue(
      "persisted-token",
    )
    mockPublicApi.post.mockResolvedValue({
      data: {
        result: {
          accessToken: "fresh-access",
          refreshToken: "fresh-refresh",
          accountState: "ACTIVE",
          requiresAdditionalInfo: false,
          sessionPersistence: "persistent",
          user: { id: 77, email: "qa@example.test", nickName: "QA" },
        },
      },
    })

    await expect(authService.restoreSession()).resolves.toMatchObject({
      user: { uid: "77" },
      entryGate: "HOME",
      sessionPersistence: "persistent",
    })

    expect(mockPublicApi.post).toHaveBeenCalledWith("/auth/tokens/refresh", {
      refreshToken: "persisted-token",
    })
    expect(mockTokenService.setTokens).toHaveBeenCalledWith(
      "fresh-access",
      "fresh-refresh",
      "persistent",
    )
    expect(mockClearClientSession).not.toHaveBeenCalled()
  })

  it("does not restore an ephemeral in-memory session after relaunch", async () => {
    mockTokenService.getRefreshToken.mockResolvedValue("ephemeral-token")

    await expect(authService.restoreSession()).resolves.toBeNull()

    expect(mockTokenService.getPersistedRefreshToken).toHaveBeenCalledTimes(1)
    expect(mockTokenService.getRefreshToken).not.toHaveBeenCalled()
    expect(mockPublicApi.post).not.toHaveBeenCalled()
    expect(mockClearClientSession).not.toHaveBeenCalled()
  })

  it("clears the client session after a rejected persisted-token refresh", async () => {
    mockTokenService.getPersistedRefreshToken.mockResolvedValue("expired-token")
    mockPublicApi.post.mockRejectedValue(
      new ApiError("expired", "AUTH_SESSION_EXPIRED", 401, false),
    )

    await expect(authService.restoreSession()).resolves.toBeNull()

    expect(mockClearClientSession).toHaveBeenCalledWith({
      requireFreshSocialProviderSelection: true,
    })
    expect(mockClearClientSession).toHaveBeenCalledTimes(1)
  })

  it("clears the client session after a refresh network failure", async () => {
    mockTokenService.getPersistedRefreshToken.mockResolvedValue("network-token")
    mockPublicApi.post.mockRejectedValue(new Error("network unavailable"))

    await expect(authService.restoreSession()).resolves.toBeNull()

    expect(mockClearClientSession).toHaveBeenCalledWith({
      requireFreshSocialProviderSelection: true,
    })
    expect(mockClearClientSession).toHaveBeenCalledTimes(1)
  })
})
