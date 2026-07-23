/* eslint-disable import/first */

const mockAsyncStorage = {
  setItem: jest.fn(),
}
const mockAuthReset = jest.fn()
const mockUserReset = jest.fn()
const mockClearTokens = jest.fn()
const mockQueryClear = jest.fn()

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: mockAsyncStorage,
}))

jest.mock("../src/stores", () => ({
  useAuthStore: { getState: () => ({ reset: mockAuthReset }) },
  useUserStore: { getState: () => ({ reset: mockUserReset }) },
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
