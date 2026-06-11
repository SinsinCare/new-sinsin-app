import axios from "axios"

import { getBackendUrl } from "@/src/config/appConfig"
import type { MobilePolicyResponse, MobilePolicyRuntimeInfo } from "../types"

type MobilePolicyApiPayload =
  | MobilePolicyResponse
  | {
      result?: MobilePolicyResponse
    }

const API_TIMEOUT_MS = 10000

export function resolveMobilePolicyBaseUrl(backendUrl: string): string {
  const normalizedUrl = backendUrl.trim().replace(/\/+$/, "")

  try {
    const url = new URL(normalizedUrl)
    if (/^\/api\/v\d+$/i.test(url.pathname)) {
      url.pathname = ""
    }
    url.search = ""
    url.hash = ""
    return url.toString().replace(/\/+$/, "")
  } catch {
    return normalizedUrl.replace(/\/api\/v\d+$/i, "")
  }
}

export async function fetchMobilePolicy(
  runtimeInfo: MobilePolicyRuntimeInfo,
): Promise<MobilePolicyResponse> {
  const mobilePolicyApi = axios.create({
    baseURL: resolveMobilePolicyBaseUrl(getBackendUrl()),
    timeout: API_TIMEOUT_MS,
    headers: { "Content-Type": "application/json" },
  })

  const response = await mobilePolicyApi.get<MobilePolicyApiPayload>(
    "/public/mobile-policy",
    {
      params: {
        platform: runtimeInfo.platform,
        environment: runtimeInfo.environment,
        appVersion: runtimeInfo.appVersion,
        buildNumber: runtimeInfo.buildNumber,
        apiContractVersion: runtimeInfo.apiContractVersion,
      },
    },
  )

  const payload = response.data
  if ("result" in payload && payload.result) {
    return payload.result
  }
  return payload as MobilePolicyResponse
}
