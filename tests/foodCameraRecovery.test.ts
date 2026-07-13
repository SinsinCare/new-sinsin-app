import { api } from "../src/services/core"
import { foodCameraService } from "../src/services/data/foodCameraService"
import {
  createFoodAnalysisRecovery,
  type FoodAnalysisRecoveryDeps,
} from "../src/features/home/services/foodAnalysisRecovery"
import {
  PENDING_ANALYSIS_REQUESTS_KEY,
  createPendingAnalysisRequestStorage,
} from "../src/features/home/storage/pendingAnalysisRequests"

jest.mock("../src/config/appConfig", () => ({
  appConfig: {
    foodAnalysisConfirmationEnabled: false,
  },
  getBackendUrl: () => "https://backend.test/api/v1",
  isMockMode: () => false,
}))

jest.mock("../src/services/core", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}))

jest.mock("../src/services/core/tokenService", () => ({
  tokenService: {
    getAccessToken: jest.fn(() => Promise.resolve("test-token")),
  },
}))

jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: {
    manipulate: jest.fn(),
  },
  SaveFormat: {
    JPEG: "jpeg",
  },
}))

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file://cache/",
  copyAsync: jest.fn(),
}))

function createMemoryStorage(initial?: Record<string, string>) {
  const values = new Map(Object.entries(initial ?? {}))
  return {
    getItem: jest.fn((key: string) => Promise.resolve(values.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      values.set(key, value)
      return Promise.resolve()
    }),
    removeItem: jest.fn((key: string) => {
      values.delete(key)
      return Promise.resolve()
    }),
  }
}

function createAnalysisResult(overrides: Record<string, unknown> = {}) {
  return {
    foodAnalysisResultId: 7,
    servings: 1,
    eatenPercentage: 100,
    title: "저염 샐러드",
    imageUrl: "https://cdn.test/food.jpg",
    foods: [],
    total: {
      calories: 120,
      protein: 4,
      carbohydrates: 12,
      fat: 3,
      sodium: 210,
      potassium: 150,
      phosphorus: 80,
      water: 20,
    },
    evaluation: {
      comment: "좋아요",
      score: 90,
      cautionFoods: [],
      detail: {
        riskFactors: "",
        disclaimer: "AI 추정 결과입니다.",
      },
    },
    ...overrides,
  }
}

describe("pending food analysis request storage", () => {
  it("persists pending requests and removes them by requestId", async () => {
    const storage = createPendingAnalysisRequestStorage(createMemoryStorage())

    await storage.add({
      requestId: "food-req-1",
      mealType: "LUNCH",
      imageUri: "file://meal.jpg",
      startedAt: 100,
    })

    await expect(storage.getAll()).resolves.toEqual([
      {
        requestId: "food-req-1",
        mealType: "LUNCH",
        imageUri: "file://meal.jpg",
        startedAt: 100,
      },
    ])

    await storage.remove("food-req-1")
    await expect(storage.getAll()).resolves.toEqual([])
  })

  it("treats malformed storage as empty", async () => {
    const storage = createPendingAnalysisRequestStorage(
      createMemoryStorage({ [PENDING_ANALYSIS_REQUESTS_KEY]: "not-json" }),
    )

    await expect(storage.getAll()).resolves.toEqual([])
  })
})

describe("food analysis recovery", () => {
  it("recovers completed requests into the pending analysis store", async () => {
    const pendingRequests = createPendingAnalysisRequestStorage(
      createMemoryStorage({
        [PENDING_ANALYSIS_REQUESTS_KEY]: JSON.stringify([
          {
            requestId: "food-req-2",
            mealType: "DINNER",
            imageUri: "file://dinner.jpg",
            startedAt: 100,
          },
        ]),
      }),
    )
    const setPending = jest.fn()
    const markHandledRequestId = jest.fn()
    const recovery = createFoodAnalysisRecovery({
      pendingRequests,
      fetchByRequestId: jest.fn(() =>
        Promise.resolve(createAnalysisResult({ foodAnalysisResultId: 22 })),
      ),
      setPending,
      markHandledRequestId,
      now: () => 1000,
    } satisfies FoodAnalysisRecoveryDeps)

    await recovery.recoverPendingAnalyses()

    expect(setPending).toHaveBeenCalledWith({
      result: expect.objectContaining({ foodAnalysisResultId: 22 }),
      mealType: "DINNER",
      imageUri: "https://cdn.test/food.jpg",
    })
    expect(markHandledRequestId).toHaveBeenCalledWith("food-req-2")
    await expect(pendingRequests.getAll()).resolves.toEqual([])
  })

  it("keeps unfinished requests for a later recovery attempt", async () => {
    const pendingRequests = createPendingAnalysisRequestStorage(
      createMemoryStorage({
        [PENDING_ANALYSIS_REQUESTS_KEY]: JSON.stringify([
          {
            requestId: "food-req-3",
            mealType: "SNACKS",
            imageUri: null,
            startedAt: 100,
          },
        ]),
      }),
    )
    const setPending = jest.fn()
    const recovery = createFoodAnalysisRecovery({
      pendingRequests,
      fetchByRequestId: jest.fn(() => Promise.resolve(null)),
      setPending,
      markHandledRequestId: jest.fn(),
      now: () => 1000,
    } satisfies FoodAnalysisRecoveryDeps)

    await recovery.recoverPendingAnalyses()

    expect(setPending).not.toHaveBeenCalled()
    await expect(pendingRequests.getAll()).resolves.toHaveLength(1)
  })

  it("keeps confirmation jobs pending without opening the disabled survey", async () => {
    const pendingRequests = createPendingAnalysisRequestStorage(
      createMemoryStorage({
        [PENDING_ANALYSIS_REQUESTS_KEY]: JSON.stringify([
          {
            requestId: "food-req-confirmation-hidden",
            mealType: "LUNCH",
            imageUri: "file://lunch.jpg",
            startedAt: 100,
          },
        ]),
      }),
    )
    const setPendingConfirmation = jest.fn()
    const recovery = createFoodAnalysisRecovery({
      pendingRequests,
      fetchByRequestId: jest.fn(() => Promise.resolve(null)),
      fetchJobByRequestId: jest.fn(() =>
        Promise.resolve({
          analysisId: "analysis-hidden",
          requestId: "food-req-confirmation-hidden",
          status: "NEEDS_CONFIRMATION",
          confirmationQuestions: [],
        }),
      ),
      setPending: jest.fn(),
      setPendingConfirmation,
      confirmationEnabled: false,
      markHandledRequestId: jest.fn(),
      now: () => 1000,
    } satisfies FoodAnalysisRecoveryDeps)

    await recovery.recoverPendingAnalyses()

    expect(setPendingConfirmation).not.toHaveBeenCalled()
    await expect(pendingRequests.getAll()).resolves.toHaveLength(1)
  })

  it("can restore the preserved confirmation flow with the feature flag", async () => {
    const pendingRequests = createPendingAnalysisRequestStorage(
      createMemoryStorage({
        [PENDING_ANALYSIS_REQUESTS_KEY]: JSON.stringify([
          {
            requestId: "food-req-confirmation-enabled",
            mealType: "DINNER",
            imageUri: null,
            startedAt: 100,
          },
        ]),
      }),
    )
    const setPendingConfirmation = jest.fn()
    const job = {
      analysisId: "analysis-enabled",
      requestId: "food-req-confirmation-enabled",
      status: "NEEDS_CONFIRMATION" as const,
      confirmationQuestions: [],
    }
    const recovery = createFoodAnalysisRecovery({
      pendingRequests,
      fetchByRequestId: jest.fn(() => Promise.resolve(null)),
      fetchJobByRequestId: jest.fn(() => Promise.resolve(job)),
      setPending: jest.fn(),
      setPendingConfirmation,
      confirmationEnabled: true,
      markHandledRequestId: jest.fn(),
      now: () => 1000,
    } satisfies FoodAnalysisRecoveryDeps)

    await recovery.recoverPendingAnalyses()

    expect(setPendingConfirmation).toHaveBeenCalledWith({
      job,
      mealType: "DINNER",
      imageUri: null,
    })
    await expect(pendingRequests.getAll()).resolves.toHaveLength(1)
  })
})

describe("foodCameraService requestId contract", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("sends requestId with text analysis requests", async () => {
    ;(api.post as jest.Mock).mockResolvedValue({
      data: { result: createAnalysisResult() },
    })

    await (
      foodCameraService.analyzeText as unknown as (
        text: string,
        requestId?: string,
      ) => Promise<unknown>
    )("저염 샐러드", "food-req-4")

    expect(api.post).toHaveBeenCalledWith(
      "/food-camera/analyze-text",
      {
        text: "저염 샐러드",
        requestId: "food-req-4",
      },
      { timeout: 180000 },
    )
  })

  it("creates post-meal image analysis with the idempotency fields", async () => {
    const append = jest.fn()
    const originalFormData = global.FormData
    Object.defineProperty(global, "FormData", {
      configurable: true,
      value: jest.fn(() => ({ append })),
    })
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({
        isSuccess: true,
        result: {
          analysisId: "analysis-create",
          requestId: "food-req-create",
          status: "QUEUED",
          pollAfterMs: 1500,
        },
      }),
    } as Response)

    try {
      await foodCameraService.createAnalysis(
        "file://meal.jpg",
        "food-req-create",
      )
      expect(append).toHaveBeenCalledWith("requestId", "food-req-create")
      expect(append).toHaveBeenCalledWith("mode", "POST_MEAL")
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/food-analyses"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Idempotency-Key": "food-req-create",
          }),
        }),
      )
    } finally {
      fetchMock.mockRestore()
      Object.defineProperty(global, "FormData", {
        configurable: true,
        value: originalFormData,
      })
    }
  })

  it("fetches completed analysis by requestId", async () => {
    ;(api.get as jest.Mock).mockResolvedValue({
      data: { result: createAnalysisResult({ foodAnalysisResultId: 44 }) },
    })

    await expect(
      (
        foodCameraService as unknown as {
          fetchByRequestId: (requestId: string) => Promise<unknown>
        }
      ).fetchByRequestId("food-req-5"),
    ).resolves.toMatchObject({ foodAnalysisResultId: 44 })

    expect(api.get).toHaveBeenCalledWith("/food-camera/analysis-results", {
      params: { requestId: "food-req-5" },
    })
  })

  it("maps a v2 READY revision to the existing result-card contract", async () => {
    ;(api.get as jest.Mock).mockResolvedValue({
      data: {
        result: {
          analysisId: "analysis-1",
          requestId: "food-req-v2",
          status: "READY",
          result: {
            revision: {
              revisionId: "revision-1",
              catalogSnapshotId: "catalog-1",
              policyVersion: "renal-1",
              nutritionFingerprint: "fingerprint-1",
              fullTotal: createAnalysisResult().total,
              evaluation: createAnalysisResult().evaluation,
              items: [
                {
                  analysisItemId: "item-1",
                  canonicalFoodId: "food-1",
                  name: "저염 샐러드",
                  analyzedGrams: 180,
                  fullNutrients: createAnalysisResult().total,
                  provenance: "CATALOG",
                  confidence: 0.98,
                },
              ],
            },
          },
        },
      },
    })

    await expect(
      foodCameraService.fetchAnalysis("analysis-1"),
    ).resolves.toMatchObject({
      status: "READY",
      result: {
        revisionId: "revision-1",
        catalogSnapshotId: "catalog-1",
        foods: [
          {
            analysisItemId: "item-1",
            servingSizeValue: 180,
            servingSizeUnit: "g",
            provenance: "CATALOG",
          },
        ],
      },
    })
  })

  it("normalizes the transitional top-level READY payload", async () => {
    ;(api.get as jest.Mock).mockResolvedValue({
      data: {
        result: {
          analysisId: "analysis-top-level",
          requestId: "food-req-top-level",
          status: "READY",
          revision: {
            revisionId: "revision-top-level",
            catalogSnapshotId: "catalog-top-level",
            policyVersion: "renal-1",
            nutritionFingerprint: "fingerprint-top-level",
            fullTotal: createAnalysisResult().total,
            evaluation: createAnalysisResult().evaluation,
            items: [
              {
                analysisItemId: "item-top-level",
                canonicalFoodId: "food-top-level",
                name: "현미밥",
                analyzedGrams: 150,
                fullNutrients: createAnalysisResult().total,
                provenance: "CATALOG",
                confidence: 0.95,
              },
            ],
          },
        },
      },
    })

    await expect(
      foodCameraService.fetchAnalysis("analysis-top-level"),
    ).resolves.toMatchObject({
      status: "READY",
      result: {
        analysisId: "analysis-top-level",
        revisionId: "revision-top-level",
        foods: [{ analysisItemId: "item-top-level", name: "현미밥" }],
      },
    })
  })

  it("sends consumption updates without the legacy servings field", async () => {
    ;(api.patch as jest.Mock).mockResolvedValue({
      data: {
        result: {
          analysisId: "analysis-2",
          requestId: "food-req-v2-2",
          status: "READY",
          result: createAnalysisResult({ analysisId: "analysis-2" }),
        },
      },
    })

    await foodCameraService.updateConsumption("analysis-2", {
      baseRevisionId: "revision-2",
      items: [
        {
          analysisItemId: "item-2",
          consumedRatio: 0.5,
          brothConsumedRatio: 0.25,
        },
      ],
    })

    expect(api.patch).toHaveBeenCalledWith(
      "/food-analyses/analysis-2/consumption",
      {
        baseRevisionId: "revision-2",
        items: [
          {
            analysisItemId: "item-2",
            consumedRatio: 0.5,
            brothConsumedRatio: 0.25,
          },
        ],
      },
    )
  })
})
