/** Centralized, bounded and credential-safe device logging. */
const isDev =
  (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ === true

const SENSITIVE_KEY =
  /token|authorization|password|passcode|secret|cookie|authkey|otp|keyhash|nativeappkey|userinfo|nativeerror|email|phone|displayname|fullname|userid|uid/iu
const MAX_LOG_DEPTH = 4
const MAX_LOG_ITEMS = 30
const MAX_LOG_STRING_LENGTH = 2_000

export function redactSensitiveText(value: string): string {
  return value
    .replace(/\bBearer\s+[^\s,;]+/giu, "Bearer [REDACTED]")
    .replace(
      /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/gu,
      "[REDACTED_JWT]",
    )
    .replace(
      /([?&](?:access_token|refresh_token|id_token|token|authKey|code|password|secret|otp|email|phone)=)[^&#\s]+/giu,
      "$1[REDACTED]",
    )
    .replace(
      /(["']?(?:accessToken|refreshToken|idToken|authorization|password|passcode|secret|otp|email|phone)["']?\s*[:=]\s*["']?)[^"',;\s}]+/giu,
      "$1[REDACTED]",
    )
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, "[REDACTED_EMAIL]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/gu, "[REDACTED_PHONE]")
    .slice(0, MAX_LOG_STRING_LENGTH)
}

function sanitizeLogValue(
  value: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (typeof value === "string") return redactSensitiveText(value)
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "undefined"
  ) {
    return value
  }
  if (value instanceof Error) {
    const errorCode = (value as Error & { code?: unknown }).code
    return {
      name: value.name,
      message: redactSensitiveText(value.message),
      ...(typeof errorCode === "string" ? { code: errorCode } : {}),
    }
  }
  if (typeof value !== "object") return String(value)
  if (seen.has(value)) return "[Circular]"
  if (depth >= MAX_LOG_DEPTH) return "[Truncated]"
  seen.add(value)

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_LOG_ITEMS)
      .map((item) => sanitizeLogValue(item, depth + 1, seen))
  }

  const sanitized: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value).slice(0, MAX_LOG_ITEMS)) {
    sanitized[key] = SENSITIVE_KEY.test(key.replace(/[_-]/gu, ""))
      ? "[REDACTED]"
      : sanitizeLogValue(item, depth + 1, seen)
  }
  return sanitized
}

function formatArg(value: unknown): string {
  const sanitized = sanitizeLogValue(value)
  if (typeof sanitized === "string") return sanitized
  try {
    return JSON.stringify(sanitized)
  } catch {
    return "[Unserializable]"
  }
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.log(...args.map((arg) => sanitizeLogValue(arg)))
  },

  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args.map((arg) => sanitizeLogValue(arg)))
  },

  /** Logs in all builds after recursively removing credentials and PII. */
  error: (message: string, ...extras: unknown[]) => {
    const safeMessage = redactSensitiveText(message)
    if (extras.length === 0) {
      console.error(safeMessage)
      return
    }
    const detail = extras.map(formatArg).join(" ")
    console.error(safeMessage, detail || "")
  },
}
