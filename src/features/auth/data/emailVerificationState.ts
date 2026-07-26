export function normalizeSignupEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isVerifiedEmailMatch(
  verifiedEmail: string | null,
  currentEmail: string,
) {
  return (
    verifiedEmail !== null &&
    normalizeSignupEmail(verifiedEmail) === normalizeSignupEmail(currentEmail)
  )
}

export type EmailOtpVerificationStatus =
  | "idle"
  | "active"
  | "expired"
  | "error"
  | "verified"

type EmailOtpVerificationSnapshot = {
  codeSent: boolean
  timer: number
  error?: string | null
  verified: boolean
}

/**
 * Keeps visual OTP feedback and network guards on the same state-machine
 * boundary. An expired code must never be submitted for verification.
 */
export function getEmailOtpVerificationStatus({
  codeSent,
  timer,
  error = null,
  verified,
}: EmailOtpVerificationSnapshot): EmailOtpVerificationStatus {
  if (verified) return "verified"
  if (codeSent && timer <= 0) return "expired"
  if (error) return "error"
  if (codeSent) return "active"
  return "idle"
}

export function canVerifyEmailOtp({
  codeSent,
  timer,
  verified,
}: EmailOtpVerificationSnapshot) {
  return codeSent && timer > 0 && !verified
}
