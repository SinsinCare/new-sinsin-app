import { ApiError } from "../src/services/core/apiError"
import {
  getSocialLoginErrorAction,
  getSocialLoginSuccessAction,
} from "../src/features/auth/utils/socialLoginFlow"

const isCancelled = (error: unknown) =>
  error instanceof Error && error.message === "cancelled"

describe("social login flow", () => {
  it("uses a valid social-link token before provider-email guidance", () => {
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
        socialLinkToken: "recovery-token",
      },
    )

    expect(getSocialLoginErrorAction(error, "google", isCancelled)).toEqual({
      type: "social_link_required",
      provider: "google",
      socialLinkToken: "recovery-token",
    })
  })

  it("carries a valid auth attempt id into the manual email recovery route", () => {
    const error = new ApiError(
      "provider email required",
      "AUTH_ERROR_004",
      400,
      false,
      undefined,
      {
        provider: "kakao",
        socialLinkToken: "recovery-token",
        authAttemptId: "12345678-1234-4123-8123-123456789abc",
      },
    )

    expect(getSocialLoginErrorAction(error, "kakao", isCancelled)).toEqual({
      type: "social_link_required",
      provider: "kakao",
      socialLinkToken: "recovery-token",
      authAttemptId: "12345678-1234-4123-8123-123456789abc",
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
        title: `${label}에서 이메일을 받지 못했어요`,
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
        authAttemptId: "12345678-1234-4123-8123-123456789abc",
      }),
    ).toEqual({
      type: "consent_required",
      provider: "kakao",
      socialSignupToken: "signup-token",
      authAttemptId: "12345678-1234-4123-8123-123456789abc",
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

  it("uses the manual email recovery flow without provider-email markers too", () => {
    const error = new ApiError(
      "social link recovery required",
      "SOCIAL_EMAIL_NOT_FOUND",
      400,
      false,
      undefined,
      {
        provider: "apple",
        socialLinkToken: "recovery-token",
      },
    )

    expect(getSocialLoginErrorAction(error, "apple", isCancelled)).toEqual({
      type: "social_link_required",
      provider: "apple",
      socialLinkToken: "recovery-token",
    })
  })

  it("keeps unknown and malformed errors on the generic path", () => {
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
