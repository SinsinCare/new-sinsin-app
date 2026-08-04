/* Fresh CommonJS module instances are required to test module-level token caches. */
/* eslint-disable @typescript-eslint/no-require-imports */

type SecureStoreMock = {
  isAvailableAsync: jest.Mock<Promise<boolean>, []>
  getItemAsync: jest.Mock<Promise<string | null>, [string]>
  setItemAsync: jest.Mock<Promise<void>, [string, string, unknown?]>
  deleteItemAsync: jest.Mock<Promise<void>, [string]>
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: string
}

async function loadTokenService(options: {
  available: boolean
  secureValues?: Record<string, string | null>
  legacyValues?: [string, string][]
}) {
  jest.resetModules()
  const secureValues = { ...(options.secureValues ?? {}) }
  const secureStore: SecureStoreMock = {
    isAvailableAsync: jest.fn(async () => options.available),
    getItemAsync: jest.fn(async (key) => secureValues[key] ?? null),
    setItemAsync: jest.fn(async (key, value) => {
      secureValues[key] = value
    }),
    deleteItemAsync: jest.fn(async (key) => {
      delete secureValues[key]
    }),
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
  }
  jest.doMock("expo-secure-store", () => secureStore)

  const asyncStorageModule =
    require("@react-native-async-storage/async-storage") as {
      default?: unknown
    }
  const AsyncStorage = (asyncStorageModule.default ?? asyncStorageModule) as {
    clear: () => Promise<void>
    multiSet: jest.Mock<Promise<void>, [[string, string][]]>
    multiGet: jest.Mock
    multiRemove: jest.Mock
    setItem: jest.Mock
  }
  await AsyncStorage.clear()
  if (options.legacyValues) {
    await AsyncStorage.multiSet(options.legacyValues)
  }
  jest.clearAllMocks()

  const { tokenService } = require("../src/services/core/tokenService") as {
    tokenService: typeof import("../src/services/core/tokenService").tokenService
  }
  return { tokenService, secureStore, AsyncStorage }
}

describe("tokenService secure persistence", () => {
  it("single-flights concurrent SecureStore hydration and caches the pair", async () => {
    const { tokenService, secureStore } = await loadTokenService({
      available: true,
      secureValues: {
        "sinsin.accessToken": "access",
        "sinsin.refreshToken": "refresh",
      },
    })

    await expect(
      Promise.all([
        tokenService.getAccessToken(),
        tokenService.getRefreshToken(),
        tokenService.getPersistedRefreshToken(),
      ]),
    ).resolves.toEqual(["access", "refresh", "refresh"])
    await tokenService.getAccessToken()

    expect(secureStore.isAvailableAsync).toHaveBeenCalledTimes(1)
    expect(secureStore.getItemAsync).toHaveBeenCalledTimes(2)
  })

  it("deletes a partial secure pair instead of authenticating with it", async () => {
    const { tokenService, secureStore } = await loadTokenService({
      available: true,
      secureValues: {
        "sinsin.accessToken": "orphaned-access",
      },
    })

    await expect(tokenService.getAccessToken()).resolves.toBeNull()
    await expect(tokenService.getRefreshToken()).resolves.toBeNull()
    expect(secureStore.deleteItemAsync).toHaveBeenCalledTimes(2)
  })

  it("migrates a complete legacy pair before removing plaintext values", async () => {
    const { tokenService, secureStore, AsyncStorage } = await loadTokenService({
      available: true,
      legacyValues: [
        ["@sinsin/accessToken", "legacy-access"],
        ["@sinsin/refreshToken", "legacy-refresh"],
      ],
    })

    await expect(tokenService.getAccessToken()).resolves.toBe("legacy-access")
    expect(secureStore.setItemAsync).toHaveBeenCalledTimes(2)
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      "sinsin.accessToken",
      "legacy-access",
      {
        keychainAccessible: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
      },
    )
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
      "@sinsin/accessToken",
      "@sinsin/refreshToken",
    ])
  })

  it("uses memory only when SecureStore is unavailable and never writes plaintext", async () => {
    const { tokenService, secureStore, AsyncStorage } = await loadTokenService({
      available: false,
    })

    await tokenService.setTokens("memory-access", "memory-refresh")

    await expect(tokenService.getAccessToken()).resolves.toBe("memory-access")
    expect(secureStore.setItemAsync).not.toHaveBeenCalled()
    expect(AsyncStorage.setItem).not.toHaveBeenCalled()
    expect(AsyncStorage.multiSet).not.toHaveBeenCalled()
  })

  it("can clear a session without first reading a failing secure store", async () => {
    const { tokenService, secureStore } = await loadTokenService({
      available: true,
    })
    secureStore.getItemAsync.mockRejectedValue(new Error("secure read failed"))

    await expect(tokenService.clearTokens()).resolves.toBeUndefined()

    expect(secureStore.getItemAsync).not.toHaveBeenCalled()
    expect(secureStore.deleteItemAsync).toHaveBeenCalledTimes(2)
  })
})
