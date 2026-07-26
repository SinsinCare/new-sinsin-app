/**
 * Password-flow tokens are opaque server values. This only guards direct or
 * stale navigation into a password screen; expiry remains server-authoritative.
 */
export function getPasswordFlowToken(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null
  return value
}
