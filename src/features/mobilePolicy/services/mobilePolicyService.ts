import type {
  MobilePolicyDecision,
  MobilePolicyEvaluation,
  MobilePolicyFetcher,
  MobilePolicyResponse,
  MobilePolicyRuntimeInfo,
  MobilePolicyStorage,
} from "../types"

export const MOBILE_POLICY_CACHE_KEY = "mobilePolicy:lastSuccessful:v1"

interface MobilePolicyServiceDeps {
  fetchPolicy: MobilePolicyFetcher
  storage: MobilePolicyStorage
  maxAttempts?: number
}

const FALLBACK_POLICY: MobilePolicyResponse = {
  decision: "allow",
  reason: "policy_unavailable_no_cache",
  message: "버전 정책을 확인하지 못했지만 앱 사용을 계속합니다.",
}

export function isBlockingMobilePolicyDecision(
  decision: MobilePolicyDecision,
): boolean {
  return (
    decision === "force_update" ||
    decision === "unsupported_contract" ||
    decision === "maintenance"
  )
}

export function isFeatureFlagEnabled(
  policy: MobilePolicyResponse | null | undefined,
  flagName: string,
  fallback = false,
): boolean {
  const value = policy?.featureFlags?.[flagName]
  return typeof value === "boolean" ? value : fallback
}

export function isRestaurantTabEnabled(
  policy: MobilePolicyResponse | null | undefined,
): boolean {
  return isFeatureFlagEnabled(policy, "restaurantTab", false)
}

export function createMobilePolicyService({
  fetchPolicy,
  storage,
  maxAttempts = 2,
}: MobilePolicyServiceDeps) {
  async function readCachedPolicy(): Promise<MobilePolicyResponse | null> {
    const cached = await storage.getItem(MOBILE_POLICY_CACHE_KEY)
    if (!cached) return null
    try {
      return JSON.parse(cached) as MobilePolicyResponse
    } catch {
      return null
    }
  }

  async function fetchWithRetry(
    runtimeInfo: MobilePolicyRuntimeInfo,
  ): Promise<MobilePolicyResponse> {
    let lastError: unknown
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        return await fetchPolicy(runtimeInfo)
      } catch (error) {
        lastError = error
      }
    }
    throw lastError
  }

  return {
    async evaluate(
      runtimeInfo: MobilePolicyRuntimeInfo,
    ): Promise<MobilePolicyEvaluation> {
      try {
        const policy = await fetchWithRetry(runtimeInfo)
        await storage.setItem(MOBILE_POLICY_CACHE_KEY, JSON.stringify(policy))
        return { policy, source: "server" }
      } catch {
        const cachedPolicy = await readCachedPolicy()
        if (cachedPolicy) {
          return { policy: cachedPolicy, source: "cache" }
        }
        return { policy: FALLBACK_POLICY, source: "fallback" }
      }
    },
  }
}
