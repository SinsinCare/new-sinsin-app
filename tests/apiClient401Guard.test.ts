/* eslint-disable import/first */
/**
 * 401 가드 — **자격 증명 불일치는 세션 만료가 아니다.**
 *
 * `PATCH /user/password` 는 현재 비밀번호가 틀리면 `LOGIN_ERROR_001`(401) 을 준다. 예전
 * 인터셉터는 401 이면 무조건 토큰을 갱신하고 재시도한 뒤(또 401) 세션을 지웠다 —
 * 오타 한 번에 로그아웃. 서버가 붙인 코드가 `TOKEN_ERROR_*` 가 아니면 갱신·삭제 없이
 * 그대로 올려야 한다. 양성 대조군(`TOKEN_ERROR_003`)은 여전히 갱신을 부른다.
 */
jest.mock("../src/config/appConfig", () => ({
  getBackendUrl: () => "https://backend-test.example/api/v1",
}))

/*
  실제 `refreshAccessToken` 은 새 토큰을 **저장**하고, 재시도 요청의 요청 인터셉터가
  그 저장값을 다시 읽어 Authorization 을 붙인다. 목도 같은 계약을 지켜야 재시도
  헤더를 검증할 수 있다 — 저장값이 안 바뀌면 재시도가 옛 토큰으로 나간다.
*/
let currentAccessToken = "tok"
const refreshAccessToken = jest.fn(async () => {
  currentAccessToken = "fresh-token"
  return currentAccessToken
})
const clearClientSessionOn401 = jest.fn(async () => undefined)

jest.mock("../src/services/core/tokenService", () => ({
  tokenService: {
    getAccessToken: jest.fn(async () => currentAccessToken),
  },
}))

jest.mock("../src/services/core/authSession", () => ({
  refreshAccessToken: () => refreshAccessToken(),
  createSessionExpiredError: () => new Error("session-expired"),
}))

jest.mock("../src/services/core/sessionCleanup", () => ({
  clearClientSessionOn401: () => clearClientSessionOn401(),
}))

jest.mock("../src/services/errorService", () => ({
  reportError: jest.fn(),
}))

import { AxiosError, type InternalAxiosRequestConfig } from "axios"

import { api } from "../src/services/core/apiClient"
import { ApiError } from "../src/services/core/apiError"

interface Scripted {
  readonly status: number
  readonly body: Record<string, unknown>
}

/** 호출 순서대로 답한다. 스크립트가 바닥나면 마지막 답을 반복한다. */
function installScriptedAdapter(script: readonly Scripted[]) {
  const calls: InternalAxiosRequestConfig[] = []
  api.defaults.adapter = async (config) => {
    calls.push(config)
    const step = script[Math.min(calls.length - 1, script.length - 1)]!
    const response = {
      data: step.body,
      status: step.status,
      statusText: String(step.status),
      headers: {},
      config,
    }
    if (step.status >= 400) {
      throw new AxiosError(
        `Request failed with status code ${step.status}`,
        "ERR_BAD_REQUEST",
        config,
        null,
        response,
      )
    }
    return response
  }
  return calls
}

beforeEach(() => {
  currentAccessToken = "tok"
  refreshAccessToken.mockClear()
  clearClientSessionOn401.mockClear()
})

describe("401 가드", () => {
  test("LOGIN_ERROR_001 401 은 갱신·재시도·세션 삭제 없이 ApiError 로 올라온다", async () => {
    const calls = installScriptedAdapter([
      {
        status: 401,
        body: {
          isSuccess: false,
          code: "LOGIN_ERROR_001",
          message: "아이디 또는 비밀번호가 일치하지 않습니다.",
          result: null,
        },
      },
    ])

    const failure = await api
      .patch("/user/password", {
        currentPassword: "wrong",
        newPassword: "Zz9876!",
      })
      .then(
        () => null,
        (error: unknown) => error,
      )

    expect(failure).toBeInstanceOf(ApiError)
    expect((failure as ApiError).code).toBe("LOGIN_ERROR_001")
    expect((failure as ApiError).statusCode).toBe(401)
    // 한 번만 나갔다 — 재시도 없음.
    expect(calls).toHaveLength(1)
    expect(refreshAccessToken).not.toHaveBeenCalled()
    expect(clearClientSessionOn401).not.toHaveBeenCalled()
  })

  test("양성 대조군: TOKEN_ERROR_003 401 은 갱신 후 재시도한다", async () => {
    const calls = installScriptedAdapter([
      {
        status: 401,
        body: {
          isSuccess: false,
          code: "TOKEN_ERROR_003",
          message: "만료",
          result: null,
        },
      },
      {
        status: 200,
        body: {
          isSuccess: true,
          code: "COMMON_SUCCESS_001",
          result: { ok: true },
        },
      },
    ])

    const response = await api.get("/user/profile")

    expect(response.status).toBe(200)
    expect(calls).toHaveLength(2)
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(calls[1]?.headers?.Authorization).toBe("Bearer fresh-token")
    expect(clearClientSessionOn401).not.toHaveBeenCalled()
  })

  test("코드 없는 401 은 예전처럼 갱신을 시도한다", async () => {
    const calls = installScriptedAdapter([
      { status: 401, body: {} },
      {
        status: 200,
        body: { isSuccess: true, code: "COMMON_SUCCESS_001", result: {} },
      },
    ])

    await api.get("/user/profile")

    expect(calls).toHaveLength(2)
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
  })
})
