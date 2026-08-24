/* eslint-disable import/first */
const mockPublicApi = { post: jest.fn() }
const mockTokenService = { setTokens: jest.fn() }

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}))

jest.mock("../src/services/core", () => ({
  api: { get: jest.fn(), post: jest.fn() },
  clearClientSession: jest.fn(),
  publicApi: mockPublicApi,
  tokenService: mockTokenService,
}))

jest.mock("../src/config/appConfig", () => ({
  isMockUser: jest.fn(() => false),
}))

jest.mock("../src/lib/logger", () => ({
  logger: { debug: jest.fn(), error: jest.fn() },
}))

import { authService } from "../src/services/auth/authService"
import { ApiError } from "../src/services/core/apiError"
/* eslint-enable import/first */

describe("social auth HTTP contract", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTokenService.setTokens.mockResolvedValue(undefined)
  })

  it.each(["AUTH_ERROR_011", "SOCIAL_CONSENT_REQUIRED"])(
    "turns rejected HTTP 409 %s into the consent-required result",
    async (code) => {
      mockPublicApi.post.mockRejectedValueOnce(
        new ApiError("consent required", code, 409, false, undefined, {
          provider: "kakao",
          socialSignupToken: "signup-token",
        }),
      )

      await expect(
        authService.signInWithSocial("kakao", "kakao-access-token"),
      ).resolves.toMatchObject({
        status: "SOCIAL_CONSENT_REQUIRED",
        provider: "kakao",
        socialSignupToken: "signup-token",
        authAttemptId: expect.stringMatching(/^[0-9a-f-]{36}$/u),
      })
      expect(mockTokenService.setTokens).not.toHaveBeenCalled()
    },
  )

  it("also accepts a 409 envelope returned by an alternate HTTP adapter", async () => {
    mockPublicApi.post.mockResolvedValueOnce({
      status: 409,
      data: {
        isSuccess: false,
        code: "AUTH_ERROR_011",
        result: {
          provider: "kakao",
          socialSignupToken: "signup-token",
        },
      },
    })

    await expect(
      authService.signInWithSocial("kakao", "kakao-access-token"),
    ).resolves.toMatchObject({
      status: "SOCIAL_CONSENT_REQUIRED",
      socialSignupToken: "signup-token",
    })
  })

  it("does not swallow a malformed 409 that has no signup token", async () => {
    const malformed = new ApiError(
      "consent required",
      "AUTH_ERROR_011",
      409,
      false,
      undefined,
      { provider: "kakao" },
    )
    mockPublicApi.post.mockRejectedValueOnce(malformed)

    await expect(
      authService.signInWithSocial("kakao", "kakao-access-token"),
    ).rejects.toBe(malformed)
  })

  it("keeps one attempt id through manual email OTP and the later consent 409", async () => {
    const recovery = new ApiError(
      "provider email required",
      "AUTH_ERROR_004",
      400,
      false,
      undefined,
      {
        provider: "kakao",
        socialLinkToken: "social-link-token",
      },
    )
    mockPublicApi.post.mockRejectedValueOnce(recovery)

    await expect(
      authService.signInWithSocial("kakao", "kakao-access-token"),
    ).rejects.toBe(recovery)
    const attemptId = (recovery.result as { authAttemptId?: string })
      .authAttemptId
    expect(attemptId).toMatch(/^[0-9a-f-]{36}$/u)
    expect(mockPublicApi.post.mock.calls[0]?.[2]).toMatchObject({
      headers: { "X-Auth-Attempt-Id": attemptId },
    })

    mockPublicApi.post.mockResolvedValueOnce({ data: { isSuccess: true } })
    await authService.sendSocialLinkEmailCode(
      "social-link-token",
      "user@example.com",
      attemptId,
    )
    expect(mockPublicApi.post.mock.calls[1]?.[2]).toMatchObject({
      headers: { "X-Auth-Attempt-Id": attemptId },
    })

    mockPublicApi.post.mockRejectedValueOnce(
      new ApiError(
        "consent required",
        "AUTH_ERROR_011",
        409,
        false,
        undefined,
        {
          provider: "kakao",
          socialSignupToken: "signup-token",
        },
      ),
    )
    await expect(
      authService.verifySocialLinkEmailCode(
        "social-link-token",
        "user@example.com",
        "123456",
        attemptId,
      ),
    ).resolves.toEqual({
      status: "SOCIAL_CONSENT_REQUIRED",
      provider: "kakao",
      socialSignupToken: "signup-token",
      authAttemptId: attemptId,
    })
    expect(mockPublicApi.post.mock.calls[2]?.[2]).toMatchObject({
      headers: { "X-Auth-Attempt-Id": attemptId },
    })
  })
})
