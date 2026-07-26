/* eslint-disable import/first */

const mockPublicApi = {
  get: jest.fn(),
  patch: jest.fn(),
}
const mockApi = {
  patch: jest.fn(),
}
const mockIsMockUser = jest.fn<boolean, []>()

jest.mock("../src/config/appConfig", () => ({
  isMockUser: mockIsMockUser,
}))

jest.mock("../src/services/core/apiClient", () => ({
  api: mockApi,
  publicApi: mockPublicApi,
}))

import { passwordService } from "../src/services/auth/passwordService"
import { nicknameService } from "../src/services/auth/nicknameService"
import { ApiError } from "../src/services/core/apiError"

describe("mock auth service adapters", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("completes reset-password submit and nickname availability without backend requests", async () => {
    mockIsMockUser.mockReturnValue(true)

    await expect(
      passwordService.changePassword("next-password", "mock-reset-token"),
    ).resolves.toBeUndefined()
    await expect(
      nicknameService.checkNicknameAvailability("테스트닉네임"),
    ).resolves.toBe(true)

    expect(mockPublicApi.patch).not.toHaveBeenCalled()
    expect(mockApi.patch).not.toHaveBeenCalled()
    expect(mockPublicApi.get).not.toHaveBeenCalled()
  })

  it("retains real backend requests when mock auth is disabled", async () => {
    mockIsMockUser.mockReturnValue(false)
    mockPublicApi.patch.mockResolvedValue({})
    mockPublicApi.get.mockResolvedValue({})

    await passwordService.changePassword("next-password", "reset-token")
    await expect(
      nicknameService.checkNicknameAvailability("테스트닉네임"),
    ).resolves.toBe(true)

    expect(mockPublicApi.patch).toHaveBeenCalledWith("/auth/password/reset", {
      resetToken: "reset-token",
      password: "next-password",
    })
    expect(mockPublicApi.get).toHaveBeenCalledWith(
      "/auth/signup/nickname/verify?nickName=%ED%85%8C%EC%8A%A4%ED%8A%B8%EB%8B%89%EB%84%A4%EC%9E%84",
    )
  })

  it("retains the real nickname availability error boundary", async () => {
    mockIsMockUser.mockReturnValue(false)
    mockPublicApi.get.mockRejectedValue(
      new ApiError("duplicate", "NICKNAME_TAKEN", 409),
    )

    await expect(
      nicknameService.checkNicknameAvailability("이미사용중"),
    ).resolves.toBe(false)

    mockPublicApi.get.mockRejectedValue(
      new ApiError("offline", "NETWORK", undefined, true),
    )

    await expect(
      nicknameService.checkNicknameAvailability("네트워크오류"),
    ).rejects.toThrow("offline")

    mockPublicApi.patch.mockRejectedValue(new Error("reset failed"))

    await expect(
      passwordService.changePassword("next-password", "reset-token"),
    ).rejects.toThrow("reset failed")
  })
})
