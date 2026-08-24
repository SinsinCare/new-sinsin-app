const AUTH_ATTEMPT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u

/** Hermes에 crypto.randomUUID가 없어 비식별 correlation UUID만 직접 만든다. */
export function createAuthAttemptId(): string {
  let result = ""
  for (let index = 0; index < 36; index += 1) {
    if (index === 8 || index === 13 || index === 18 || index === 23) {
      result += "-"
    } else if (index === 14) {
      result += "4"
    } else {
      const random = Math.floor(Math.random() * 16)
      result += (index === 19 ? (random & 3) | 8 : random).toString(16)
    }
  }
  return result
}

export function normalizeAuthAttemptId(value: unknown): string | undefined {
  return typeof value === "string" && AUTH_ATTEMPT_ID_PATTERN.test(value)
    ? value
    : undefined
}

export function authAttemptRequestConfig(authAttemptId?: string) {
  const normalized = normalizeAuthAttemptId(authAttemptId)
  return normalized
    ? { headers: { "X-Auth-Attempt-Id": normalized } }
    : undefined
}
