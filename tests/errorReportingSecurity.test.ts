/* The fetch mock is captured by a hoisted Jest factory before source imports. */
/* eslint-disable import/first */

const mockFetchWithTimeout = jest.fn(
  async (_input: string, _init: RequestInit, _timeoutMs: number) => ({
    ok: true,
  }),
)

jest.mock("../src/config/appConfig", () => ({
  getBackendUrl: () => "https://backend.test/api/v1",
}))

jest.mock("../src/i18n", () => ({
  getAppLanguage: () => "ko",
}))

jest.mock("../src/services/core/tokenService", () => ({
  tokenService: {
    getAccessToken: jest.fn(async () => "access-token"),
  },
}))

jest.mock("../src/services/core/fetchWithTimeout", () => ({
  fetchWithTimeout: mockFetchWithTimeout,
}))

import {
  reportError,
  resetErrorReportRateLimitForTests,
  sanitizeErrorReportPayload,
} from "../src/services/errorService"
import { redactSensitiveText } from "../src/lib/logger"

describe("error reporting security boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetErrorReportRateLimitForTests()
  })

  it("drops query secrets and redacts bearer/JWT values", () => {
    const payload = sanitizeErrorReportPayload({
      method: "post",
      path: "https://backend.test/api/v1/profile?access_token=secret#fragment",
      error_code: "AUTH_FAILURE",
      message: "Authorization Bearer top-secret eyJabcdefgh.abcdefgh.abcdefgh",
    })

    expect(payload).toMatchObject({
      method: "POST",
      path: "/api/v1/profile",
      error_code: "AUTH_FAILURE",
    })
    expect(payload.message).not.toContain("top-secret")
    expect(payload.message).not.toContain("eyJabcdefgh")
    expect(redactSensitiveText("Bearer abc.def")).toBe("Bearer [REDACTED]")
  })

  it("deduplicates identical reports inside the storm window", async () => {
    const payload = {
      status_code: 500,
      method: "GET",
      path: "/api/v1/profile?token=secret",
      error_code: "INTERNAL",
    }

    await Promise.all([reportError(payload), reportError(payload)])

    expect(mockFetchWithTimeout).toHaveBeenCalledTimes(1)
    const init = mockFetchWithTimeout.mock.calls[0][1] as RequestInit
    expect(String(init.body)).not.toContain("secret")
  })
})
