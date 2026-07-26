import { ApiError } from "../src/services/core/apiError"
import {
  getSocialLoginErrorAction,
  getSocialLoginSuccessAction,
} from "../src/features/auth/utils/socialLoginFlow"
import { getPostAuthenticationDestination } from "../src/features/auth/data/emailLoginFlow"

const isCancelled = (error: unknown) =>
  error instanceof Error && error.message === "cancelled"

describe("social login flow", () => {
  it("prioritizes provider-email guidance over a legacy social-link token", () => {
    const error = new ApiError(
      "provider email required",
      "AUTH_ERROR_004",
      400,
      false,
      undefined,
      {
        reason: "PROVIDER_EMAIL_REQUIRED",
        providerEmailRequired: true,
        provider: "google",
        socialLinkToken: "legacy-token",
      },
    )

    expect(getSocialLoginErrorAction(error, "google", isCancelled)).toEqual({
      type: "provider_email_required",
      provider: "google",
      title: "Google 이메일 정보가 필요해요",
      message: expect.stringContaining("이메일 제공에 동의"),
    })
  })

  it.each([
    ["google", "Google"],
    ["apple", "Apple"],
    ["kakao", "카카오"],
  ] as const)(
    "uses %s-specific guidance and the requested provider as a safe fallback",
    (provider, label) => {
      const error = new ApiError(
        "provider email required",
        "AUTH_ERROR_004",
        400,
        false,
        undefined,
        { providerEmailRequired: true },
      )

      expect(
        getSocialLoginErrorAction(error, provider, isCancelled),
      ).toMatchObject({
        type: "provider_email_required",
        provider,
        title: `${label} 이메일 정보가 필요해요`,
        message: expect.stringContaining("다른 로그인 방법"),
      })
    },
  )

  it("routes verified provider-email signup directly to consent", () => {
    expect(
      getSocialLoginSuccessAction({
        status: "SOCIAL_CONSENT_REQUIRED",
        provider: "kakao",
        socialSignupToken: "signup-token",
      }),
    ).toEqual({
      type: "consent_required",
      provider: "kakao",
      socialSignupToken: "signup-token",
    })
  })

  it("leaves an existing linked account on the completed login path", () => {
    expect(
      getSocialLoginSuccessAction({
        user: {
          uid: "existing-user-id",
          email: "existing@example.com",
          displayName: "Existing",
        },
        accountState: "ACTIVE",
        requiresAdditionalInfo: false,
      }),
    ).toEqual({ type: "completed" })
  })

  it("preserves withdrawal recovery before generic error handling", () => {
    const error = new ApiError(
      "withdrawal pending",
      "AUTH_ERROR_008",
      409,
      false,
      undefined,
      {
        cancelToken: "cancel-token",
        withdrawalDueAt: "2026-07-20T00:00:00+09:00",
      },
    )

    expect(getSocialLoginErrorAction(error, "apple", isCancelled)).toEqual({
      type: "withdrawal_pending",
      result: {
        cancelToken: "cancel-token",
        withdrawalDueAt: "2026-07-20T00:00:00+09:00",
      },
    })
  })

  it("keeps native provider cancellation silent", () => {
    expect(
      getSocialLoginErrorAction(new Error("cancelled"), "google", isCancelled),
    ).toEqual({ type: "cancelled" })
  })

  it("uses the restored account entry gate after withdrawal cancellation", () => {
    expect(
      getPostAuthenticationDestination({
        accountState: "ACTIVE",
        requiresAdditionalInfo: false,
        entryGate: "ONBOARDING",
      }),
    ).toBe("/onboarding")
  })

  it("falls back to the legacy manual email flow only without provider-email markers", () => {
    const error = new ApiError(
      "legacy social link required",
      "SOCIAL_EMAIL_NOT_FOUND",
      400,
      false,
      undefined,
      {
        provider: "apple",
        socialLinkToken: "legacy-token",
      },
    )

    expect(getSocialLoginErrorAction(error, "apple", isCancelled)).toEqual({
      type: "legacy_social_link_required",
      provider: "apple",
      socialLinkToken: "legacy-token",
    })
  })

  it("keeps unknown and malformed legacy errors on the generic path", () => {
    const malformedLegacyError = new ApiError(
      "missing token",
      "AUTH_ERROR_004",
      400,
      false,
      undefined,
      { provider: "google" },
    )

    expect(
      getSocialLoginErrorAction(malformedLegacyError, "google", isCancelled),
    ).toEqual({ type: "generic" })
    expect(
      getSocialLoginErrorAction(
        new Error("network failed"),
        "google",
        isCancelled,
      ),
    ).toEqual({ type: "generic" })
  })
})
