import {
  PASSWORD_RESET_OTP_DURATION,
  canStartPasswordResetSend,
  canVerifyPasswordResetOtp,
  createInitialPasswordResetFlowState,
  formatPasswordResetTimer,
  isPasswordResetEmailCurrent,
  passwordResetFlowReducer,
  shouldResetPasswordResetFlowForEmailChange,
  type PasswordResetFlowState,
} from "../src/features/auth/data/passwordResetFlow"

function createActiveOtpState(
  email = "alloy0301@gmail.com",
): PasswordResetFlowState {
  const sending = passwordResetFlowReducer(
    createInitialPasswordResetFlowState(),
    { type: "send_started" },
  )
  return passwordResetFlowReducer(sending, {
    type: "send_succeeded",
    email,
  })
}

describe("password reset flow", () => {
  it("starts an email OTP window with a normalized requested email", () => {
    const state = createActiveOtpState(" Alloy0301@Gmail.COM ")

    expect(state).toMatchObject({
      step: "otp",
      codeSent: true,
      requestedEmail: "alloy0301@gmail.com",
      resetToken: null,
      timer: PASSWORD_RESET_OTP_DURATION,
      error: null,
      activeOtpRequest: null,
    })
    expect(
      isPasswordResetEmailCurrent(state.requestedEmail, state.requestedEmail!),
    ).toBe(true)
    expect(formatPasswordResetTimer(state.timer)).toBe("03:00")
  })

  it("resets code, token, timer, and error when the requested email changes", () => {
    const verified = passwordResetFlowReducer(
      passwordResetFlowReducer(createActiveOtpState(), {
        type: "verify_started",
        email: "alloy0301@gmail.com",
      }),
      { type: "verify_succeeded", resetToken: "reset-token" },
    )
    const staleState = {
      ...verified,
      error: "stale server error",
      timer: 21,
    }

    expect(
      shouldResetPasswordResetFlowForEmailChange(
        staleState.requestedEmail,
        "other@gmail.com",
      ),
    ).toBe(true)
    expect(
      passwordResetFlowReducer(staleState, {
        type: "email_changed",
        email: "other@gmail.com",
      }),
    ).toEqual(createInitialPasswordResetFlowState())
  })

  it("keeps OTP state when only email casing or surrounding spaces change", () => {
    const state = createActiveOtpState()

    expect(
      passwordResetFlowReducer(state, {
        type: "email_changed",
        email: " ALLOY0301@GMAIL.COM ",
      }),
    ).toBe(state)
  })

  it("requires the resend email to remain valid and current before verify", () => {
    const state = createActiveOtpState()

    expect(canVerifyPasswordResetOtp(state, " alloy0301@gmail.com ")).toBe(true)
    expect(canVerifyPasswordResetOtp(state, "other@gmail.com")).toBe(false)
  })

  it("blocks verify when the OTP timer reaches zero", () => {
    const expired = {
      ...createActiveOtpState(),
      timer: 0,
    }

    expect(canVerifyPasswordResetOtp(expired, "alloy0301@gmail.com")).toBe(
      false,
    )
    expect(
      passwordResetFlowReducer(expired, {
        type: "verify_started",
        email: "alloy0301@gmail.com",
      }),
    ).toBe(expired)
  })

  it("keeps send and verify mutually exclusive", () => {
    const sending = passwordResetFlowReducer(createActiveOtpState(), {
      type: "send_started",
    })
    expect(sending.activeOtpRequest).toBe("send")
    expect(
      passwordResetFlowReducer(sending, {
        type: "verify_started",
        email: "alloy0301@gmail.com",
      }),
    ).toBe(sending)

    const verifying = passwordResetFlowReducer(createActiveOtpState(), {
      type: "verify_started",
      email: "alloy0301@gmail.com",
    })
    expect(verifying.activeOtpRequest).toBe("verify")
    expect(canStartPasswordResetSend(verifying)).toBe(false)
    expect(passwordResetFlowReducer(verifying, { type: "send_started" })).toBe(
      verifying,
    )
  })

  it("clears a server error when retrying and preserves a live retry window", () => {
    const verifying = passwordResetFlowReducer(createActiveOtpState(), {
      type: "verify_started",
      email: "alloy0301@gmail.com",
    })
    const failed = passwordResetFlowReducer(verifying, {
      type: "verify_failed",
      error: "네트워크 연결을 확인해주세요.",
    })

    expect(failed.error).toBe("네트워크 연결을 확인해주세요.")
    expect(failed.timer).toBe(PASSWORD_RESET_OTP_DURATION)

    const retrying = passwordResetFlowReducer(failed, {
      type: "verify_started",
      email: "alloy0301@gmail.com",
    })
    expect(retrying.error).toBeNull()
    expect(retrying.activeOtpRequest).toBe("verify")
  })

  it("invalidates the reset token on stepwise back navigation", () => {
    const verifying = passwordResetFlowReducer(createActiveOtpState(), {
      type: "verify_started",
      email: "alloy0301@gmail.com",
    })
    const password = passwordResetFlowReducer(verifying, {
      type: "verify_succeeded",
      resetToken: "reset-token",
    })

    const otp = passwordResetFlowReducer(password, { type: "back" })
    expect(otp).toMatchObject({
      step: "otp",
      resetToken: null,
      timer: 0,
      codeSent: true,
    })
    expect(passwordResetFlowReducer(otp, { type: "back" })).toEqual(
      createInitialPasswordResetFlowState(),
    )
  })
})
