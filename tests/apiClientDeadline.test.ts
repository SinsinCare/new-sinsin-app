/* eslint-disable import/first */
/**
 * 데드라인 어댑터 — okhttp 디스패처 큐 기아 대응.
 *
 * axios 의 XHR timeout 은 Android 에서 큐 대기 중에는 시작되지 않는다. 슬롯을 점유한
 * 요청이 영원히 settle 하지 않으면 뒤의 요청도 영원히 pending 이다. JS 타이머가 모든
 * 요청에 절대 데드라인을 걸고, 멱등 요청(GET/HEAD)만 새 연결로 한 번 재시도한다.
 */
jest.mock("../src/config/appConfig", () => ({
  getBackendUrl: () => "https://backend.test/api/v1",
}))

jest.mock("../src/lib/logger", () => ({
  logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

jest.mock("../src/services/core/tokenService", () => ({
  tokenService: {
    getAccessToken: jest.fn().mockResolvedValue(null),
  },
}))

jest.mock("../src/services/core/authSession", () => ({
  refreshAccessToken: jest.fn(),
  createSessionExpiredError: jest.fn(),
}))

jest.mock("../src/services/core/sessionCleanup", () => ({
  clearClientSessionOn401: jest.fn(),
}))

jest.mock("../src/services/errorService", () => ({
  reportError: jest.fn(),
}))

import { AxiosError, type InternalAxiosRequestConfig } from "axios"

import { createDeadlineAdapter } from "../src/services/core/apiClient"

function makeConfig(
  overrides: Partial<InternalAxiosRequestConfig> = {},
): InternalAxiosRequestConfig {
  return {
    method: "get",
    url: "/community/posts/1/comments",
    timeout: 10000,
    headers: {},
    ...overrides,
  } as InternalAxiosRequestConfig
}

function mockAxiosResponse(config: InternalAxiosRequestConfig) {
  return {
    data: { isSuccess: true },
    status: 200,
    statusText: "OK",
    headers: {},
    config,
  }
}

describe("createDeadlineAdapter", () => {
  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it("settles a request stuck in the native dispatch queue even if the adapter ignores abort", async () => {
    jest.useFakeTimers()
    // okhttp 디스패처 큐 기아 시뮬레이션: abort에도 반응하지 않고 영원히 pending
    const baseAdapter = jest.fn(() => new Promise<never>(() => {}))
    const adapter = createDeadlineAdapter(baseAdapter)

    const pending = adapter(makeConfig())
    const assertion = expect(pending).rejects.toMatchObject({
      code: "ECONNABORTED",
    })
    // 1차 시도(10s + 5s 유예) + 멱등 재시도 1회
    await jest.advanceTimersByTimeAsync(15000)
    await jest.advanceTimersByTimeAsync(15000)
    await assertion
    expect(baseAdapter).toHaveBeenCalledTimes(2)
  })

  it("aborts the underlying call at the deadline so dead sockets get closed", async () => {
    jest.useFakeTimers()
    const seenSignals: AbortSignal[] = []
    const baseAdapter = jest.fn(
      (config: InternalAxiosRequestConfig) =>
        new Promise<never>((_, reject) => {
          const signal = config.signal as AbortSignal
          seenSignals.push(signal)
          signal.addEventListener("abort", () =>
            reject(new AxiosError("canceled", "ERR_CANCELED", config)),
          )
        }),
    )
    const adapter = createDeadlineAdapter(baseAdapter)

    const pending = adapter(makeConfig({ method: "post" }))
    const assertion = expect(pending).rejects.toMatchObject({
      code: "ECONNABORTED",
    })
    await jest.advanceTimersByTimeAsync(15000)
    await assertion
    // POST는 재시도하지 않는다.
    expect(baseAdapter).toHaveBeenCalledTimes(1)
    expect(seenSignals[0]?.aborted).toBe(true)
  })

  it("retries an idempotent request once on a fresh connection after a network failure", async () => {
    const config = makeConfig()
    const baseAdapter = jest
      .fn()
      .mockRejectedValueOnce(
        new AxiosError("Network Error", "ERR_NETWORK", config),
      )
      .mockResolvedValueOnce(mockAxiosResponse(config))
    const adapter = createDeadlineAdapter(baseAdapter)

    await expect(adapter(config)).resolves.toMatchObject({ status: 200 })
    expect(baseAdapter).toHaveBeenCalledTimes(2)
  })

  it("does not retry external cancellations or server-side errors", async () => {
    const config = makeConfig()
    const canceled = jest
      .fn()
      .mockRejectedValue(new AxiosError("canceled", "ERR_CANCELED", config))
    await expect(createDeadlineAdapter(canceled)(config)).rejects.toMatchObject(
      { code: "ERR_CANCELED" },
    )
    expect(canceled).toHaveBeenCalledTimes(1)

    const serverError = new AxiosError(
      "Server error",
      "ERR_BAD_RESPONSE",
      config,
    )
    serverError.response = { status: 500 } as AxiosError["response"]
    const failing = jest.fn().mockRejectedValue(serverError)
    await expect(createDeadlineAdapter(failing)(config)).rejects.toMatchObject({
      code: "ERR_BAD_RESPONSE",
    })
    expect(failing).toHaveBeenCalledTimes(1)
  })

  it("leaves explicit timeout: 0 requests without a deadline", async () => {
    const config = makeConfig({ timeout: 0 })
    const baseAdapter = jest.fn().mockResolvedValue(mockAxiosResponse(config))
    const adapter = createDeadlineAdapter(baseAdapter)

    await expect(adapter(config)).resolves.toMatchObject({ status: 200 })
    expect(baseAdapter).toHaveBeenCalledWith(config)
    expect(baseAdapter.mock.calls[0][0].signal).toBeUndefined()
  })
})
