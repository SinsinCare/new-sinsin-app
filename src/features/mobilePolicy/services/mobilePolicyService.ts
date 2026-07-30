import type {
  MobilePolicyDecision,
  MobilePolicyEvaluation,
  MobilePolicyFetcher,
  MobilePolicyResponse,
  MobilePolicyRuntimeInfo,
  MobilePolicyStorage,
} from "../types"

export const MOBILE_POLICY_CACHE_KEY = "mobilePolicy:lastSuccessful:v2"

export function getMobilePolicyCacheKey(locale: string): string {
  const language = locale.toLowerCase().startsWith("en") ? "en" : "ko"
  return `${MOBILE_POLICY_CACHE_KEY}:${language}`
}

interface MobilePolicyServiceDeps {
  fetchPolicy: MobilePolicyFetcher
  storage: MobilePolicyStorage
  maxAttempts?: number
}

function fallbackPolicy(locale: string): MobilePolicyResponse {
  return {
    decision: "allow",
    reason: "policy_unavailable_no_cache",
    message: locale.toLowerCase().startsWith("en")
      ? "We couldn't check this version right now. You can keep using the app."
      : "버전을 확인하지 못했어요. 현재 버전으로 계속 이용할 수 있어요.",
  }
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
  async function readCachedPolicy(
    locale: string,
  ): Promise<MobilePolicyResponse | null> {
    const cached = await storage.getItem(getMobilePolicyCacheKey(locale))
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
      locale = "ko",
    ): Promise<MobilePolicyEvaluation> {
      try {
        const policy = await fetchWithRetry(runtimeInfo)
        await storage.setItem(
          getMobilePolicyCacheKey(locale),
          JSON.stringify(policy),
        )
        return { policy, source: "server" }
      } catch {
        const cachedPolicy = await readCachedPolicy(locale)
        if (cachedPolicy) {
          return { policy: cachedPolicy, source: "cache" }
        }
        return { policy: fallbackPolicy(locale), source: "fallback" }
      }
    },
  }
}
