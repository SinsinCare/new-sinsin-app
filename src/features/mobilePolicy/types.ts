export type MobilePolicyDecision =
  | "allow"
  | "recommend_update"
  | "force_update"
  | "maintenance"
  | "unsupported_contract"

export type MobilePolicyEnvironment = "test" | "production"
export type MobilePolicyPlatform = "ios" | "android"

export interface MobilePolicyRuntimeInfo {
  platform: MobilePolicyPlatform
  environment: MobilePolicyEnvironment
  appVersion: string
  buildNumber: number
  apiContractVersion: number
}

export interface MobilePolicyVersionSummary {
  appVersion: string
  buildNumber: number
  status?: string
}

export interface MobilePolicyResponse {
  decision: MobilePolicyDecision
  reason: string
  current?: {
    appVersion: string
    buildNumber: number
    apiContractVersion: number
  }
  matchedVersion?: MobilePolicyVersionSummary | null
  latest?: MobilePolicyVersionSummary | null
  storeUrl?: string | null
  message?: string | null
  featureFlags?: Record<string, unknown>
  aiPolicy?: Record<string, unknown>
  cacheTtlSeconds?: number
}

export type MobilePolicySource = "server" | "cache" | "fallback"

export interface MobilePolicyEvaluation {
  policy: MobilePolicyResponse
  source: MobilePolicySource
}

export interface MobilePolicyStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

export type MobilePolicyFetcher = (
  runtimeInfo: MobilePolicyRuntimeInfo,
) => Promise<MobilePolicyResponse>
