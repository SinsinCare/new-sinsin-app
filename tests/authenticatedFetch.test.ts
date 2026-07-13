import { authenticatedFetch } from "../src/services/core/authenticatedFetch"
import { clearClientSession } from "../src/services/core/sessionCleanup"
import { tokenService } from "../src/services/core/tokenService"

jest.mock("../src/config/appConfig", () => ({
  getBackendUrl: () => "https://backend.test/api/v1",
}))

jest.mock("../src/services/core/tokenService", () => ({
  tokenService: {
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    setTokens: jest.fn(),
  },
}))

jest.mock("../src/services/core/sessionCleanup", () => ({
  clearClientSession: jest.fn(),
}))

const mockedTokenService = tokenService as jest.Mocked<typeof tokenService>
const mockedClearClientSession = clearClientSession as jest.MockedFunction<
  typeof clearClientSession
>

function mockResponse(
  status: number,
  data: Record<string, unknown> = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(data),
  } as unknown as Response
}

describe("authenticatedFetch", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedTokenService.getAccessToken.mockResolvedValue("expired-access")
    mockedTokenService.getRefreshToken.mockResolvedValue("valid-refresh")
    mockedTokenService.setTokens.mockResolvedValue()
    mockedClearClientSession.mockResolvedValue()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("rebuilds multipart bodies and retries once with a refreshed token", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(mockResponse(401))
      .mockResolvedValueOnce(
        mockResponse(200, {
          isSuccess: true,
          result: {
            accessToken: "fresh-access",
            refreshToken: "fresh-refresh",
          },
        }),
      )
      .mockResolvedValueOnce(mockResponse(202))
    const bodies: FormData[] = []
    const createRequest = jest.fn(() => {
      const body = new FormData()
      body.append("requestId", "request-1")
      bodies.push(body)
      return { method: "POST", body }
    })

    const response = await authenticatedFetch(
      "https://backend.test/api/v1/food-analyses",
      createRequest,
    )

    expect(response.status).toBe(202)
    expect(createRequest).toHaveBeenCalledTimes(2)
    expect(bodies[0]).not.toBe(bodies[1])
    expect(mockedTokenService.setTokens).toHaveBeenCalledWith(
      "fresh-access",
      "fresh-refresh",
    )
    const firstHeaders = fetchMock.mock.calls[0][1]?.headers as Headers
    const retryHeaders = fetchMock.mock.calls[2][1]?.headers as Headers
    expect(firstHeaders.get("Authorization")).toBe("Bearer expired-access")
    expect(retryHeaders.get("Authorization")).toBe("Bearer fresh-access")
  })

  it("queues concurrent 401 responses behind one refresh request", async () => {
    let finishRefresh: ((response: Response) => void) | undefined
    const refreshResponse = new Promise<Response>((resolve) => {
      finishRefresh = resolve
    })
    let refreshCalls = 0

    jest.spyOn(global, "fetch").mockImplementation((input, init) => {
      const url = String(input)
      if (url.endsWith("/auth/tokens/refresh")) {
        refreshCalls += 1
        return refreshResponse
      }

      const authorization = (init?.headers as Headers).get("Authorization")
      return Promise.resolve(
        authorization === "Bearer fresh-access"
          ? mockResponse(202)
          : mockResponse(401),
      )
    })

    const first = authenticatedFetch(
      "https://backend.test/api/v1/food-analyses",
      () => ({ method: "POST", body: new FormData() }),
    )
    const second = authenticatedFetch(
      "https://backend.test/api/v1/food-analyses",
      () => ({ method: "POST", body: new FormData() }),
    )

    await Promise.resolve()
    await Promise.resolve()
    finishRefresh?.(
      mockResponse(200, {
        isSuccess: true,
        result: {
          accessToken: "fresh-access",
          refreshToken: "fresh-refresh",
        },
      }),
    )

    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ status: 202 }),
      expect.objectContaining({ status: 202 }),
    ])
    expect(refreshCalls).toBe(1)
    expect(mockedTokenService.setTokens).toHaveBeenCalledTimes(1)
  })

  it("clears the session and hides a raw invalid-token response when refresh fails", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        mockResponse(401, { message: "잘못된 토큰입니다" }),
      )
      .mockResolvedValueOnce(
        mockResponse(401, { message: "잘못된 리프레시 토큰입니다" }),
      )

    const request = authenticatedFetch(
      "https://backend.test/api/v1/food-analyses",
      () => ({ method: "POST", body: new FormData() }),
    )

    await expect(request).rejects.toMatchObject({
      code: "AUTH_SESSION_EXPIRED",
      message: "로그인이 만료되었습니다. 다시 로그인해주세요.",
      statusCode: 401,
    })
    expect(mockedClearClientSession).toHaveBeenCalledTimes(1)
  })
})
