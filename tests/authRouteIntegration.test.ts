import { ApiError } from "../src/services/core/apiError"
import { getPostAuthenticationDestination } from "../src/features/auth/data/emailLoginFlow"
import {
  canVerifyPasswordResetOtp,
  createInitialPasswordResetFlowState,
  passwordResetFlowReducer,
} from "../src/features/auth/data/passwordResetFlow"
import { getPasswordFlowToken } from "../src/features/auth/data/passwordFlow"
import {
  getSocialLoginErrorAction,
  getSocialLoginSuccessAction,
} from "../src/features/auth/utils/socialLoginFlow"
import { getWithdrawalPendingResult } from "../src/features/auth/utils/withdrawalPending"

const isCancelled = (error: unknown) =>
  error instanceof Error && error.message === "cancelled"

describe("auth route integration decisions", () => {
  it.each([
    ["signed-in home", "ACTIVE", false, "HOME", "/(tabs)/home"],
    [
      "profile pending",
      "PENDING_PROFILE",
      false,
      undefined,
      "/(auth)/profile-setup",
    ],
    [
      "active account requiring profile completion",
      "ACTIVE",
      true,
      undefined,
      "/(auth)/profile-setup",
    ],
    [
      "onboarding pending",
      "PENDING_ONBOARDING",
      false,
      undefined,
      "/onboarding",
    ],
    [
      "server profile gate ahead of a legacy active state",
      "ACTIVE",
      false,
      "PROFILE",
      "/(auth)/profile-setup",
    ],
    [
      "server onboarding gate ahead of a legacy active state",
      "ACTIVE",
      false,
      "ONBOARDING",
      "/onboarding",
    ],
  ] as const)(
    "routes %s to the backend-authoritative destination",
    (
      _scenario,
      accountState,
      requiresAdditionalInfo,
      entryGate,
      destination,
    ) => {
      expect(
        getPostAuthenticationDestination({
          accountState,
          requiresAdditionalInfo,
          entryGate,
        }),
      ).toBe(destination)
    },
  )

  it("keeps social signup separate from an authenticated route until consent completes", () => {
    expect(
      getSocialLoginSuccessAction({
        status: "SOCIAL_CONSENT_REQUIRED",
        provider: "google",
        socialSignupToken: "mock-social-signup-token",
      }),
    ).toEqual({
      type: "consent_required",
      provider: "google",
      socialSignupToken: "mock-social-signup-token",
    })

    expect(
      getSocialLoginSuccessAction({
        user: { uid: "mock-user", email: null, displayName: null },
        accountState: "ACTIVE",
        requiresAdditionalInfo: false,
        entryGate: "HOME",
      }),
    ).toEqual({ type: "completed" })
  })

  it("keeps a withdrawal-pending login in recovery instead of a normal error route", () => {
    const pending = new ApiError(
      "withdrawal pending",
      "AUTH_ERROR_008",
      409,
      false,
      undefined,
      {
        cancelToken: "mock-cancel-token",
        withdrawalDueAt: "2099-01-01T00:00:00+09:00",
      },
    )

    expect(getWithdrawalPendingResult(pending)).toEqual({
      cancelToken: "mock-cancel-token",
      withdrawalDueAt: "2099-01-01T00:00:00+09:00",
    })
    expect(getSocialLoginErrorAction(pending, "kakao", isCancelled)).toEqual({
      type: "withdrawal_pending",
      result: {
        cancelToken: "mock-cancel-token",
        withdrawalDueAt: "2099-01-01T00:00:00+09:00",
      },
    })
  })

  it("only routes legacy social-link recovery when a valid provider and opaque token are present", () => {
    const recovery = new ApiError(
      "link required",
      "SOCIAL_EMAIL_NOT_FOUND",
      400,
      false,
      undefined,
      { provider: "apple", socialLinkToken: "mock-link-token" },
    )

    expect(getSocialLoginErrorAction(recovery, "google", isCancelled)).toEqual({
      type: "legacy_social_link_required",
      provider: "apple",
      socialLinkToken: "mock-link-token",
    })
    expect(
      getSocialLoginErrorAction(
        new ApiError(
          "missing token",
          "SOCIAL_EMAIL_NOT_FOUND",
          400,
          false,
          undefined,
          { provider: "apple" },
        ),
        "google",
        isCancelled,
      ),
    ).toEqual({ type: "generic" })
  })

  it("requires an opaque token before signup or email-link password routes can proceed", () => {
    expect(getPasswordFlowToken(undefined)).toBeNull()
    expect(getPasswordFlowToken("   ")).toBeNull()
    expect(getPasswordFlowToken("mock-signup-token")).toBe("mock-signup-token")
    expect(getPasswordFlowToken("mock-email-link-token")).toBe(
      "mock-email-link-token",
    )
  })

  it("returns password reset through OTP before leaving the auth flow, and rejects an expired OTP", () => {
    const sent = passwordResetFlowReducer(
      passwordResetFlowReducer(createInitialPasswordResetFlowState(), {
        type: "send_started",
      }),
      { type: "send_succeeded", email: "qa@example.test" },
    )
    const verifying = passwordResetFlowReducer(sent, {
      type: "verify_started",
      email: "qa@example.test",
    })
    const password = passwordResetFlowReducer(verifying, {
      type: "verify_succeeded",
      resetToken: "mock-reset-token",
    })

    expect(password.step).toBe("password")
    expect(passwordResetFlowReducer(password, { type: "back" })).toMatchObject({
      step: "otp",
      resetToken: null,
    })
    expect(
      canVerifyPasswordResetOtp({ ...sent, timer: 0 }, "qa@example.test"),
    ).toBe(false)
  })
})
