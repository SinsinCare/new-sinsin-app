/**
 * Centralized logging: verbose output only in development.
 * Use `error` for failures you still want in device logs / future crash reporters.
 */
const isDev =
  (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ === true

function formatArg(value: unknown): string {
  if (value instanceof Error) return value.message
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.log(...args)
  },

  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args)
  },

  /**
   * Logs in all builds. Keep payloads small; avoid tokens / PII.
   */
  error: (message: string, ...extras: unknown[]) => {
    if (extras.length === 0) {
      console.error(message)
      return
    }
    const detail = extras.map(formatArg).join(" ")
    console.error(message, detail || "")
  },
}
