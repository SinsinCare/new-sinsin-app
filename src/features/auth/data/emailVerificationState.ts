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
