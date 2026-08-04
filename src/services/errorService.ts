import { getBackendUrl } from "@/src/config/appConfig"
import { getAppLanguage } from "@/src/i18n"
import { redactSensitiveText } from "@/src/lib/logger"
import { fetchWithTimeout } from "./core/fetchWithTimeout"
import { tokenService } from "./core/tokenService"

const ERROR_REPORT_TIMEOUT_MS = 3_000
const ERROR_REPORT_DEDUP_WINDOW_MS = 30_000
const ERROR_REPORT_GLOBAL_WINDOW_MS = 60_000
const MAX_ERROR_REPORTS_PER_WINDOW = 10

interface ErrorPayload {
  status_code?: number
  method?: string
  path?: string
  error_code?: string
  message?: string
}

const recentFingerprints = new Map<string, number>()
let recentReportTimes: number[] = []

export function sanitizeErrorReportPayload(
  payload: ErrorPayload,
): ErrorPayload {
  const path = sanitizePath(payload.path)
  return {
    ...(Number.isFinite(payload.status_code)
      ? { status_code: payload.status_code }
      : {}),
    ...(payload.method
      ? { method: payload.method.toUpperCase().slice(0, 12) }
      : {}),
    ...(path ? { path } : {}),
    ...(payload.error_code
      ? { error_code: redactSensitiveText(payload.error_code).slice(0, 120) }
      : {}),
    ...(payload.message
      ? { message: redactSensitiveText(payload.message).slice(0, 500) }
      : {}),
  }
}

function sanitizePath(path: string | undefined): string | undefined {
  if (!path) return undefined
  try {
    const parsed = new URL(path, getBackendUrl())
    return redactSensitiveText(parsed.pathname).slice(0, 512)
  } catch {
    return redactSensitiveText(path.split(/[?#]/u, 1)[0]).slice(0, 512)
  }
}

function shouldSend(payload: ErrorPayload, now: number): boolean {
  recentReportTimes = recentReportTimes.filter(
    (time) => now - time < ERROR_REPORT_GLOBAL_WINDOW_MS,
  )
  if (recentReportTimes.length >= MAX_ERROR_REPORTS_PER_WINDOW) return false

  const fingerprint = JSON.stringify([
    payload.status_code,
    payload.method,
    payload.path,
    payload.error_code,
  ])
  const lastSentAt = recentFingerprints.get(fingerprint)
  if (
    lastSentAt !== undefined &&
    now - lastSentAt < ERROR_REPORT_DEDUP_WINDOW_MS
  ) {
    return false
  }

  recentFingerprints.set(fingerprint, now)
  recentReportTimes.push(now)
  if (recentFingerprints.size > 100) {
    for (const [key, sentAt] of recentFingerprints) {
      if (now - sentAt >= ERROR_REPORT_DEDUP_WINDOW_MS) {
        recentFingerprints.delete(key)
      }
    }
  }
  return true
}

export async function reportError(payload: ErrorPayload): Promise<void> {
  try {
    const sanitized = sanitizeErrorReportPayload(payload)
    if (!shouldSend(sanitized, Date.now())) return

    const token = await tokenService.getAccessToken()
    await fetchWithTimeout(
      `${getBackendUrl()}/errors`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": getAppLanguage() === "en" ? "en-US" : "ko-KR",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(sanitized),
      },
      ERROR_REPORT_TIMEOUT_MS,
    )
  } catch {
    // fire-and-forget: never throw from error reporter
  }
}

export function resetErrorReportRateLimitForTests(): void {
  recentFingerprints.clear()
  recentReportTimes = []
}
