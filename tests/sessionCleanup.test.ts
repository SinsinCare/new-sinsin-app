/* eslint-disable import/first */

const mockAsyncStorage = {
  setItem: jest.fn(),
}
const mockAuthReset = jest.fn()
const mockUserReset = jest.fn()
const mockSignupReset = jest.fn()
const mockClearTokens = jest.fn()
const mockQueryClear = jest.fn()

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: mockAsyncStorage,
}))

jest.mock("../src/stores", () => ({
  useAuthStore: { getState: () => ({ reset: mockAuthReset }) },
  useUserStore: { getState: () => ({ reset: mockUserReset }) },
  useSignupStore: { getState: () => ({ reset: mockSignupReset }) },
}))

jest.mock("../src/services/core/queryClient", () => ({
  queryClient: { clear: mockQueryClear },
}))

jest.mock("../src/services/core/tokenService", () => ({
  tokenService: { clearTokens: mockClearTokens },
}))

import { clearClientSession } from "../src/services/core/sessionCleanup"

/* eslint-enable import/first */

describe("clearClientSession", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAsyncStorage.setItem.mockResolvedValue(undefined)
    mockClearTokens.mockResolvedValue(undefined)
  })

  it("marks the next social sign-in for account selection when a session expires", async () => {
    await clearClientSession({ requireFreshSocialProviderSelection: true })

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      "@sinsin/next-social-login-reauthentication",
      "required",
    )
    expect(mockClearTokens).toHaveBeenCalledTimes(1)
    expect(mockAuthReset).toHaveBeenCalledTimes(1)
    expect(mockUserReset).toHaveBeenCalledTimes(1)
    expect(mockQueryClear).toHaveBeenCalledTimes(1)
  })

  it("still clears local state when saving the account-selection intent fails", async () => {
    mockAsyncStorage.setItem.mockRejectedValueOnce(new Error("storage failed"))

    await expect(
      clearClientSession({ requireFreshSocialProviderSelection: true }),
    ).resolves.toBeUndefined()

    expect(mockClearTokens).toHaveBeenCalledTimes(1)
    expect(mockAuthReset).toHaveBeenCalledTimes(1)
    expect(mockUserReset).toHaveBeenCalledTimes(1)
    expect(mockQueryClear).toHaveBeenCalledTimes(1)
  })
})

describe("가입 중간 상태", () => {
  /*
    2026-08-19: 소셜로 가입 → 로그아웃 → 다시 `회원가입` 으로 들어가면 `signupStore` 에
    남은 빈 `signupToken`·`password` 를 그대로 물려받아, 여섯 스텝을 다 채운 뒤 마지막에
    서버가 400 을 돌려줬다. 화면에는 마지막 스텝인 "알게 된 경로" 아래에 오류가 떠서
    경로 입력이 고장난 것처럼 보였다.
  */
  it("세션이 끝나면 가입 중이던 스토어도 함께 비운다", async () => {
    await clearClientSession()
    expect(mockSignupReset).toHaveBeenCalled()
  })
})
