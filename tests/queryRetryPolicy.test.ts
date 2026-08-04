import { ApiError } from "../src/services/core/apiError"
import {
  queryClient,
  queryRetryDelay,
  shouldRetryQuery,
} from "../src/services/core/queryClient"

describe("query retry policy", () => {
  it("retries bounded transient reads but never deterministic 4xx responses", () => {
    expect(
      shouldRetryQuery(0, new ApiError("offline", "NETWORK", 0, true)),
    ).toBe(true)
    expect(shouldRetryQuery(1, new ApiError("server", "HTTP_503", 503))).toBe(
      true,
    )
    expect(shouldRetryQuery(2, new ApiError("server", "HTTP_503", 503))).toBe(
      false,
    )
    expect(shouldRetryQuery(0, new ApiError("auth", "HTTP_401", 401))).toBe(
      false,
    )
    expect(shouldRetryQuery(0, new ApiError("busy", "HTTP_429", 429))).toBe(
      false,
    )
  })

  it("disables global mutation replay and caps exponential delay", () => {
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false)
    expect([0, 1, 2, 3, 4].map(queryRetryDelay)).toEqual([
      1_000, 2_000, 4_000, 8_000, 8_000,
    ])
  })
})
