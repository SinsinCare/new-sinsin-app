import {
  MOBILE_POLICY_CACHE_KEY,
  createMobilePolicyService,
  isFeatureFlagEnabled,
  isBlockingMobilePolicyDecision,
  isRestaurantTabEnabled,
} from "../src/features/mobilePolicy/services/mobilePolicyService"
import { resolveMobilePolicyBaseUrl } from "../src/features/mobilePolicy/services/mobilePolicyClient"
import {
  resolveMobilePolicyEnvironment,
  type RuntimeInfoSource,
} from "../src/config/mobilePolicyEnvironment"
import type {
  MobilePolicyResponse,
  MobilePolicyStorage,
} from "../src/features/mobilePolicy/types"

function createStorage(initial?: MobilePolicyResponse): MobilePolicyStorage {
  const values = new Map<string, string>()
  if (initial) {
    values.set(MOBILE_POLICY_CACHE_KEY, JSON.stringify(initial))
  }
  return {
    getItem: jest.fn((key: string) => Promise.resolve(values.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      values.set(key, value)
      return Promise.resolve()
    }),
  }
}

const runtimeInfo = {
  platform: "ios",
  environment: "test",
  appVersion: "1.0.12",
  buildNumber: 3,
  apiContractVersion: 1,
} as const

const allowPolicy: MobilePolicyResponse = {
  decision: "allow",
  reason: "version_status_allowed",
  current: {
    appVersion: "1.0.12",
    buildNumber: 3,
    apiContractVersion: 1,
  },
  matchedVersion: {
    appVersion: "1.0.12",
    buildNumber: 3,
    status: "allowed",
  },
  latest: {
    appVersion: "1.0.12",
    buildNumber: 3,
  },
  storeUrl: "https://apps.apple.com/app/id6758880186",
  message: "사용 가능한 버전입니다.",
  featureFlags: { foodCameraEnabled: true },
  aiPolicy: { provider: "server" },
  cacheTtlSeconds: 300,
}

describe("mobile policy service", () => {
  it("fetches launch policy with runtime info and caches successful response", async () => {
    const storage = createStorage()
    const fetchPolicy = jest.fn().mockResolvedValue(allowPolicy)
    const service = createMobilePolicyService({ fetchPolicy, storage })

    const result = await service.evaluate(runtimeInfo)

    expect(fetchPolicy).toHaveBeenCalledWith(runtimeInfo)
    expect(storage.setItem).toHaveBeenCalledWith(
      MOBILE_POLICY_CACHE_KEY,
      JSON.stringify(allowPolicy),
    )
    expect(result.source).toBe("server")
    expect(result.policy).toEqual(allowPolicy)
  })

  it("uses cached blocking policy when the server is unavailable", async () => {
    const cachedPolicy: MobilePolicyResponse = {
      ...allowPolicy,
      decision: "force_update",
      reason: "version_status_blocked",
      message: "최신 버전으로 업데이트해주세요.",
    }
    const service = createMobilePolicyService({
      fetchPolicy: jest.fn().mockRejectedValue(new Error("network")),
      storage: createStorage(cachedPolicy),
    })

    const result = await service.evaluate(runtimeInfo)

    expect(result.source).toBe("cache")
    expect(result.policy.decision).toBe("force_update")
  })

  it("allows limited entry when both server and cache are unavailable", async () => {
    const service = createMobilePolicyService({
      fetchPolicy: jest.fn().mockRejectedValue(new Error("network")),
      storage: createStorage(),
    })

    const result = await service.evaluate(runtimeInfo)

    expect(result.source).toBe("fallback")
    expect(result.policy.decision).toBe("allow")
    expect(result.policy.reason).toBe("policy_unavailable_no_cache")
  })

  it("classifies decisions that must block the app shell", () => {
    expect(isBlockingMobilePolicyDecision("force_update")).toBe(true)
    expect(isBlockingMobilePolicyDecision("unsupported_contract")).toBe(true)
    expect(isBlockingMobilePolicyDecision("maintenance")).toBe(true)
    expect(isBlockingMobilePolicyDecision("recommend_update")).toBe(false)
    expect(isBlockingMobilePolicyDecision("allow")).toBe(false)
  })

  it("reads boolean feature flags without treating missing values as enabled", () => {
    expect(isFeatureFlagEnabled(allowPolicy, "foodCameraEnabled")).toBe(true)
    expect(isFeatureFlagEnabled(allowPolicy, "restaurantTab")).toBe(false)
    expect(
      isRestaurantTabEnabled({
        ...allowPolicy,
        featureFlags: { restaurantTab: true },
      }),
    ).toBe(true)
  })
})

describe("runtime mobile policy environment", () => {
  it("uses explicit EXPO_PUBLIC_APP_ENV when it is valid", () => {
    const source: RuntimeInfoSource = {
      explicitEnvironment: "production",
      backendUrl: "https://sinsin-test-be.example.com",
    }

    expect(resolveMobilePolicyEnvironment(source)).toBe("production")
  })

  it("falls back to test for local or test backend URLs", () => {
    expect(
      resolveMobilePolicyEnvironment({
        backendUrl: "https://sinsin-test-be.example.com",
      }),
    ).toBe("test")
    expect(
      resolveMobilePolicyEnvironment({ backendUrl: "http://localhost:8000" }),
    ).toBe("test")
  })

  it("defaults to production for unknown backend URLs", () => {
    expect(
      resolveMobilePolicyEnvironment({
        backendUrl: "https://sinsin-be.example.com",
      }),
    ).toBe("production")
  })
})

describe("mobile policy client routing", () => {
  it("uses backend origin even when the app API base URL includes /api/v1", () => {
    expect(
      resolveMobilePolicyBaseUrl(
        "https://sinsin-test-be-ummry5dxda-du.a.run.app/api/v1",
      ),
    ).toBe("https://sinsin-test-be-ummry5dxda-du.a.run.app")
  })

  it("keeps root backend URLs unchanged", () => {
    expect(
      resolveMobilePolicyBaseUrl(
        "https://sinsin-test-be-ummry5dxda-du.a.run.app",
      ),
    ).toBe("https://sinsin-test-be-ummry5dxda-du.a.run.app")
  })
})
