import { normalizeSignupEmail } from "./emailVerificationState"

export const PASSWORD_RESET_OTP_DURATION = 180

export type PasswordResetStep = "email" | "otp" | "password"
export type PasswordResetOtpRequest = "send" | "verify" | null

export interface PasswordResetFlowState {
  step: PasswordResetStep
  codeSent: boolean
  requestedEmail: string | null
  resetToken: string | null
  timer: number
  error: string | null
  activeOtpRequest: PasswordResetOtpRequest
}

export type PasswordResetFlowEvent =
  | { type: "email_changed"; email: string }
  | { type: "send_started" }
  | { type: "send_succeeded"; email: string }
  | { type: "send_failed"; error: string }
  | { type: "verify_started"; email: string }
  | { type: "verify_succeeded"; resetToken: string }
  | { type: "verify_failed"; error: string }
  | {
      type: "request_cancelled"
      request: Exclude<PasswordResetOtpRequest, null>
    }
  | { type: "timer_ticked" }
  | { type: "back" }

export function createInitialPasswordResetFlowState(): PasswordResetFlowState {
  return {
    step: "email",
    codeSent: false,
    requestedEmail: null,
    resetToken: null,
    timer: 0,
    error: null,
    activeOtpRequest: null,
  }
}

export function normalizePasswordResetEmail(email: string) {
  return normalizeSignupEmail(email)
}

export function isPasswordResetEmailCurrent(
  requestedEmail: string | null,
  currentEmail: string,
) {
  return (
    requestedEmail !== null &&
    requestedEmail === normalizePasswordResetEmail(currentEmail)
  )
}

export function shouldResetPasswordResetFlowForEmailChange(
  requestedEmail: string | null,
  currentEmail: string,
) {
  return (
    requestedEmail !== null &&
    !isPasswordResetEmailCurrent(requestedEmail, currentEmail)
  )
}

export function canStartPasswordResetSend(state: PasswordResetFlowState) {
  return state.step !== "password" && state.activeOtpRequest === null
}

export function canVerifyPasswordResetOtp(
  state: PasswordResetFlowState,
  currentEmail: string,
) {
  return (
    state.step === "otp" &&
    state.codeSent &&
    state.timer > 0 &&
    state.activeOtpRequest === null &&
    isPasswordResetEmailCurrent(state.requestedEmail, currentEmail)
  )
}

export function formatPasswordResetTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes.toString().padStart(2, "0")}:${remainder
    .toString()
    .padStart(2, "0")}`
}

export function passwordResetFlowReducer(
  state: PasswordResetFlowState,
  event: PasswordResetFlowEvent,
): PasswordResetFlowState {
  switch (event.type) {
    case "email_changed":
      return shouldResetPasswordResetFlowForEmailChange(
        state.requestedEmail,
        event.email,
      )
        ? createInitialPasswordResetFlowState()
        : state

    case "send_started":
      if (!canStartPasswordResetSend(state)) return state
      return {
        ...state,
        activeOtpRequest: "send",
        error: null,
        resetToken: null,
      }

    case "send_succeeded":
      if (state.activeOtpRequest !== "send") return state
      return {
        ...state,
        step: "otp",
        codeSent: true,
        requestedEmail: normalizePasswordResetEmail(event.email),
        resetToken: null,
        timer: PASSWORD_RESET_OTP_DURATION,
        error: null,
        activeOtpRequest: null,
      }

    case "send_failed":
      if (state.activeOtpRequest !== "send") return state
      return {
        ...state,
        error: event.error,
        activeOtpRequest: null,
      }

    case "verify_started":
      if (!canVerifyPasswordResetOtp(state, event.email)) return state
      return {
        ...state,
        error: null,
        activeOtpRequest: "verify",
      }

    case "verify_succeeded":
      if (
        state.activeOtpRequest !== "verify" ||
        event.resetToken.trim().length === 0
      )
        return state
      return {
        ...state,
        step: "password",
        resetToken: event.resetToken,
        timer: 0,
        error: null,
        activeOtpRequest: null,
      }

    case "verify_failed":
      if (state.activeOtpRequest !== "verify") return state
      return {
        ...state,
        error: event.error,
        activeOtpRequest: null,
      }

    case "request_cancelled":
      if (state.activeOtpRequest !== event.request) return state
      return {
        ...state,
        activeOtpRequest: null,
      }

    case "timer_ticked":
      if (!state.codeSent || state.timer <= 0) return state
      return {
        ...state,
        timer: state.timer - 1,
      }

    case "back":
      if (state.activeOtpRequest !== null) return state
      if (state.step === "password") {
        return {
          ...state,
          step: "otp",
          resetToken: null,
          timer: 0,
          error: null,
        }
      }
      if (state.step === "otp") {
        return createInitialPasswordResetFlowState()
      }
      return state
  }
}
