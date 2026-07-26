import { api } from "../src/services/core"
import { foodCameraService } from "../src/services/data/foodCameraService"

let mockUseMockMode = false

jest.mock("../src/config/appConfig", () => ({
  isMockMode: () => mockUseMockMode,
}))

jest.mock("../src/services/core", () => ({
  api: {
    get: jest.fn(),
  },
  authenticatedFetch: jest.fn(),
}))

jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: "jpeg" },
}))

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file://cache/",
  copyAsync: jest.fn(),
}))

describe("foodCameraService.fetchDateAnalysis", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseMockMode = false
  })

  it("uses a deterministic mock response without calling the backend in mock mode", async () => {
    mockUseMockMode = true

    await expect(
      foodCameraService.fetchDateAnalysis("2026-07-27"),
    ).resolves.toEqual({
      isSuccess: true,
      code: "SUCCESS",
      message: "Mock date analysis loaded.",
      timestamp: "2026-01-01T00:00:00.000Z",
      result: {
        analysis: {
          protein: 0,
          sodium: 0,
          potassium: 0,
          phosphorus: 0,
          water: 0,
          extraWater: 0,
          dietaryGuide: "기록된 식단이 없어요.",
          cautionFoods: [],
        },
        diets: [],
        bodyRecords: { today: null, previous: null },
        bloodPressure: null,
        bloodGlucose: [],
      },
    })

    expect(api.get).not.toHaveBeenCalled()
  })

  it("keeps the real backend adapter when mock mode is disabled", async () => {
    const response = {
      isSuccess: true,
      code: "SUCCESS",
      message: "ok",
      timestamp: "2026-07-27T00:00:00.000Z",
      result: {
        analysis: null,
        diets: [],
        bodyRecords: { today: null, previous: null },
        bloodPressure: null,
        bloodGlucose: [],
      },
    }
    ;(api.get as jest.Mock).mockResolvedValue({ data: response })

    await expect(
      foodCameraService.fetchDateAnalysis("2026-07-27"),
    ).resolves.toEqual(response)

    expect(api.get).toHaveBeenCalledWith(
      "/food-camera/date-analysis/2026-07-27",
    )
  })
})
