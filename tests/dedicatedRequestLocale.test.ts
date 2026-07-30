const mockAccessToken = jest.fn()
const mockMobilePolicyGet = jest.fn()
const mockAxiosCreate = jest.fn((_config?: unknown) => ({
  get: mockMobilePolicyGet,
}))

jest.mock("../src/config/appConfig", () => ({
  getBackendUrl: () => "https://backend.test/api/v1",
}))

jest.mock("../src/services/core", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

jest.mock("../src/services/core/tokenService", () => ({
  tokenService: {
    getAccessToken: mockAccessToken,
  },
}))

jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: {
    manipulate: jest.fn(() => {
      throw new Error("skip image processing in this network boundary test")
    }),
  },
  SaveFormat: {
    JPEG: "jpeg",
  },
}))

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file://cache/",
  copyAsync: jest.fn(),
}))

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    create: mockAxiosCreate,
  },
}))

import i18n from "../src/i18n"
import { fetchMobilePolicy } from "../src/features/mobilePolicy/services/mobilePolicyClient"
import { imageUploadService } from "../src/features/recipe/services/imageUploadService"
import { examOcrService } from "../src/services/data/examOcrService"

function mockJsonResponse(
  status: number,
  data: Record<string, unknown>,
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(data),
  } as unknown as Response
}

describe("dedicated request locale headers", () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    mockAccessToken.mockResolvedValue("access-token")
    await i18n.changeLanguage("ko")
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("uses the current language for OCR and image uploads", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        mockJsonResponse(200, {
          isSuccess: true,
          result: { reportId: 1 },
        }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse(200, {
          isSuccess: true,
          result: {
            objectPath: "images/test.jpg",
            imageUrl: "https://cdn.test/test.jpg",
            contentType: "image/jpeg",
            size: 10,
          },
        }),
      )

    await i18n.changeLanguage("en")
    await examOcrService.uploadOcr({
      uri: "file://lab.pdf",
      name: "lab.pdf",
      kind: "pdf",
    })

    await i18n.changeLanguage("ko")
    await imageUploadService.uploadImage(
      "https://cdn.test/source.jpg",
      "community",
    )

    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      "Accept-Language": "en-US",
    })
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({
      "Accept-Language": "ko-KR",
    })
  })

  it("re-evaluates the language whenever launch policy is fetched", async () => {
    mockMobilePolicyGet.mockResolvedValue({
      data: {
        decision: "allow",
        reason: "version_status_allowed",
      },
    })
    const runtimeInfo = {
      platform: "ios",
      environment: "test",
      appVersion: "1.0.0",
      buildNumber: 1,
      apiContractVersion: 1,
    } as const

    await i18n.changeLanguage("en")
    await fetchMobilePolicy(runtimeInfo)
    await i18n.changeLanguage("ko")
    await fetchMobilePolicy(runtimeInfo)

    expect(mockAxiosCreate.mock.calls[0]?.[0]).toMatchObject({
      headers: { "Accept-Language": "en-US" },
    })
    expect(mockAxiosCreate.mock.calls[1]?.[0]).toMatchObject({
      headers: { "Accept-Language": "ko-KR" },
    })
  })
})
