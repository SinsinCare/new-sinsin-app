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
  getBackendUrl: () => "https://backend.test/api/v1",
  isMockMode: () => false,
}))

jest.mock("../src/services/core", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
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
})
