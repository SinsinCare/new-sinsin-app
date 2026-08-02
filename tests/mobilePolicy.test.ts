import {
  createMobilePolicyService,
  getMobilePolicyCacheKey,
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

function createStorage(
  initial?: MobilePolicyResponse,
  locale = "ko",
): MobilePolicyStorage {
  const values = new Map<string, string>()
  if (initial) {
    values.set(getMobilePolicyCacheKey(locale), JSON.stringify(initial))
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
      getMobilePolicyCacheKey("ko"),
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

  it("keeps Korean and English policy caches separate", async () => {
    const englishPolicy: MobilePolicyResponse = {
      ...allowPolicy,
      message: "This version is ready to use.",
    }
    const storage = createStorage(englishPolicy, "en")
    const service = createMobilePolicyService({
      fetchPolicy: jest.fn().mockRejectedValue(new Error("network")),
      storage,
    })

    const english = await service.evaluate(runtimeInfo, "en-US")
    const korean = await service.evaluate(runtimeInfo, "ko-KR")

    expect(english.source).toBe("cache")
    expect(english.policy.message).toBe("This version is ready to use.")
    expect(korean.source).toBe("fallback")
    expect(korean.policy.message).toBe(
      "버전을 확인하지 못했어요. 현재 버전으로 계속 이용할 수 있어요.",
    )
    expect(getMobilePolicyCacheKey("en-US")).not.toBe(
      getMobilePolicyCacheKey("ko-KR"),
    )
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

describe("mobile policy cache-first boot", () => {
  it("캐시된 정책을 네트워크 없이 돌려준다 — 부팅 게이트가 먼저 읽는 경로", async () => {
    const fetchPolicy = jest.fn(() => Promise.resolve(allowPolicy))
    const storage = createStorage(allowPolicy)
    const service = createMobilePolicyService({ fetchPolicy, storage })

    const cached = await service.readCache("ko")

    expect(cached).toEqual(allowPolicy)
    expect(fetchPolicy).not.toHaveBeenCalled()
  })

  it("캐시가 없으면 null 을 준다 — 최초 실행은 네트워크를 기다려야 한다", async () => {
    const fetchPolicy = jest.fn(() => Promise.resolve(allowPolicy))
    const service = createMobilePolicyService({
      fetchPolicy,
      storage: createStorage(),
    })

    expect(await service.readCache("ko")).toBeNull()
    expect(fetchPolicy).not.toHaveBeenCalled()
  })

  it("언어별로 캐시를 나눠 읽는다", async () => {
    const service = createMobilePolicyService({
      fetchPolicy: jest.fn(() => Promise.resolve(allowPolicy)),
      storage: createStorage(allowPolicy, "ko"),
    })

    expect(await service.readCache("ko")).toEqual(allowPolicy)
    expect(await service.readCache("en")).toBeNull()
  })
})
