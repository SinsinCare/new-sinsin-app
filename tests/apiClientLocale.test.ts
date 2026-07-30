/* eslint-disable import/first */
jest.mock("../src/config/appConfig", () => ({
  getBackendUrl: () => "https://backend.test/api/v1",
}))

jest.mock("../src/services/core/tokenService", () => ({
  tokenService: {
    getAccessToken: jest.fn(async () => null),
  },
}))

jest.mock("../src/services/core/authSession", () => ({
  refreshAccessToken: jest.fn(),
}))

jest.mock("../src/services/errorService", () => ({
  reportError: jest.fn(),
}))

import type { AxiosInstance, InternalAxiosRequestConfig } from "axios"

import i18n from "../src/i18n"
import { api, publicApi } from "../src/services/core/apiClient"

function installCaptureAdapter(instance: AxiosInstance) {
  const requests: InternalAxiosRequestConfig[] = []
  instance.defaults.adapter = async (config) => {
    requests.push(config)
    return {
      data: { isSuccess: true, result: {} },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }
  }
  return requests
}

describe("shared API client locale header", () => {
  const protectedRequests = installCaptureAdapter(api)
  const publicRequests = installCaptureAdapter(publicApi)

  afterEach(async () => {
    await i18n.changeLanguage("ko")
    protectedRequests.length = 0
    publicRequests.length = 0
  })

  it("reads the current app language for every authenticated and public request", async () => {
    await i18n.changeLanguage("en")
    await Promise.all([api.get("/user/profile"), publicApi.get("/auth/check")])

    await i18n.changeLanguage("ko")
    await Promise.all([api.get("/user/profile"), publicApi.get("/auth/check")])

    expect(
      protectedRequests.map((request) =>
        request.headers.get("Accept-Language"),
      ),
    ).toEqual(["en-US", "ko-KR"])
    expect(
      publicRequests.map((request) => request.headers.get("Accept-Language")),
    ).toEqual(["en-US", "ko-KR"])
  })
})
