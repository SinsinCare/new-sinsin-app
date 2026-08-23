/**
 * v2 잡 조회(`GET /food-analyses/by-request/:id`)가 404 일 때 **레거시 조회로 넘어가는지**.
 *
 * 텍스트 등록(`/food-camera/analyze-text`)은 v2 잡을 만들지 않는다. 그래서 이 폴백이
 * 텍스트 등록의 유일한 복구 경로다 — 서버가 마감시한으로 503 을 돌려줘도 핸들러는
 * 계속 돌아 결과를 **저장까지 마친다**. 그 결과를 되찾는 길이 여기다.
 *
 * 예전 코드는 `isAxiosError(err)` 로 갈랐다. `api` 는 응답 인터셉터에서 모든 HTTP 오류를
 * `ApiError` 로 바꿔 던지므로 그 조건은 **항상 거짓**이었고, 폴백은 한 줄도 실행되지
 * 않았다. 겉으로는 "복구 폴링이 도는데 아무것도 못 찾는다" 로 보였다(2026-08-23 로그:
 * 대기 6건이 TTL 10분 내내 404 만 두드림).
 */

import { ApiError } from "../src/services/core/apiError"

const mockGet = jest.fn()

jest.mock("../src/services/core", () => ({
  api: { get: mockGet, post: jest.fn() },
  ApiError: jest.requireActual("../src/services/core/apiError").ApiError,
  authenticatedFetch: jest.fn(),
}))

// 이 파일은 네트워크 경계만 본다 — 사진 업로드 준비 경로는 열지 않는다.
jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: {
    manipulate: jest.fn(() => {
      throw new Error("skip image processing in this network boundary test")
    }),
  },
  SaveFormat: { JPEG: "jpeg" },
}))

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file://cache/",
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(async () => undefined),
}))

jest.mock("../src/config/appConfig", () => ({
  getBackendUrl: () => "https://example.test/api/v1",
  isMockMode: () => false,
  appConfig: { foodAnalysisConfirmationEnabled: false },
}))

import { foodCameraService } from "../src/services/data/foodCameraService"

describe("v2 by-request 404 폴백", () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  test("404(ApiError)면 레거시 analysis-results 로 되찾는다", async () => {
    mockGet
      .mockRejectedValueOnce(new ApiError("없음", "HTTP_404", 404))
      .mockResolvedValueOnce({
        data: { result: { foodAnalysisResultId: 4242, foods: [], title: "열무 비빔밥" } },
      })

    const job = await foodCameraService.fetchAnalysisByRequestId("food-abc")

    expect(job?.analysisId).toBe("4242")
    expect(job?.status).toBe("READY")
    expect(mockGet).toHaveBeenNthCalledWith(2, "/food-camera/analysis-results", {
      params: { requestId: "food-abc" },
    })
  })

  test("404 가 아닌 오류는 그대로 던진다 (폴백이 오류를 삼키면 안 된다)", async () => {
    mockGet.mockRejectedValueOnce(new ApiError("서버 오류", "HTTP_500", 500))

    await expect(foodCameraService.fetchAnalysisByRequestId("food-abc")).rejects.toThrow(
      "서버 오류",
    )
    expect(mockGet).toHaveBeenCalledTimes(1)
  })
})
