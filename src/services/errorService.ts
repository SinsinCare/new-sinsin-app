import { tokenService } from "./core/tokenService"
import { getAppLanguage } from "@/src/i18n"

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL

interface ErrorPayload {
  status_code?: number
  method?: string
  path?: string
  error_code?: string
  message?: string
}

export async function reportError(payload: ErrorPayload): Promise<void> {
  try {
    const token = await tokenService.getAccessToken()
    await fetch(`${BASE_URL}/errors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": getAppLanguage() === "en" ? "en-US" : "ko-KR",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
  } catch {
    // fire-and-forget: never throw from error reporter
  }
}
