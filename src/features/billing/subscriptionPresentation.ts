import type { CapabilityState } from "./types"

/** Preserve the server's calendar date; ISO timezone suffixes must not get a second Z. */
export function subscriptionDate(
  value: string | null | undefined,
): string | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})(?:T| |$)/u)
  if (!match) return null
  const [, year, month, day] = match
  const parsed = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  )
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day)
  )
    return null
  return `${year}.${month}.${day}`
}

export function subscriptionAccess(state: CapabilityState | undefined):
  | { kind: "unknown" | "locked" | "unlimited" }
  | {
      kind: "quota"
      window: "day" | "month"
      remaining: number
      limit: number
    } {
  if (!state) return { kind: "unknown" }
  if (state.quota) {
    const { window, remaining, limit } = state.quota
    if (
      ![remaining, limit].every(Number.isFinite) ||
      remaining < 0 ||
      limit < 0
    )
      return { kind: "unknown" }
    return { kind: "quota", window, remaining, limit }
  }
  if (state.lockState !== "open") return { kind: "locked" }
  // An open capability with a finite allowance is not unlimited.
  return {
    kind:
      state.allowance === null && state.cap === null ? "unlimited" : "unknown",
  }
}
