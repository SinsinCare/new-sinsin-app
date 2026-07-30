import AsyncStorage from "@react-native-async-storage/async-storage"
import * as SecureStore from "expo-secure-store"

const SECURE_ACCESS_TOKEN_KEY = "sinsin.accessToken"
const SECURE_REFRESH_TOKEN_KEY = "sinsin.refreshToken"
const LEGACY_ACCESS_TOKEN_KEY = "@sinsin/accessToken"
const LEGACY_REFRESH_TOKEN_KEY = "@sinsin/refreshToken"

type TokenPersistence = "persistent" | "ephemeral"

let ephemeralTokens: { accessToken: string; refreshToken: string } | null = null

let secureStoreAvailable: Promise<boolean> | null = null

async function canUseSecureStore(): Promise<boolean> {
  secureStoreAvailable ??= SecureStore.isAvailableAsync().catch(() => false)
  return secureStoreAvailable
}

async function getToken(
  secureKey: string,
  legacyKey: string,
): Promise<string | null> {
  if (await canUseSecureStore()) {
    const secureValue = await SecureStore.getItemAsync(secureKey)
    if (secureValue) return secureValue

    const legacyValue = await AsyncStorage.getItem(legacyKey)
    if (legacyValue) {
      await SecureStore.setItemAsync(secureKey, legacyValue)
      await AsyncStorage.removeItem(legacyKey)
    }
    return legacyValue
  }

  return AsyncStorage.getItem(legacyKey)
}

async function clearPersistedTokens(): Promise<void> {
  await Promise.all([
    canUseSecureStore().then((available) =>
      available
        ? Promise.all([
            SecureStore.deleteItemAsync(SECURE_ACCESS_TOKEN_KEY),
            SecureStore.deleteItemAsync(SECURE_REFRESH_TOKEN_KEY),
          ])
        : undefined,
    ),
    AsyncStorage.multiRemove([
      LEGACY_ACCESS_TOKEN_KEY,
      LEGACY_REFRESH_TOKEN_KEY,
    ]),
  ])
}

export const tokenService = {
  async getAccessToken(): Promise<string | null> {
    if (ephemeralTokens) return ephemeralTokens.accessToken
    return getToken(SECURE_ACCESS_TOKEN_KEY, LEGACY_ACCESS_TOKEN_KEY)
  },

  async getRefreshToken(): Promise<string | null> {
    if (ephemeralTokens) return ephemeralTokens.refreshToken
    return getToken(SECURE_REFRESH_TOKEN_KEY, LEGACY_REFRESH_TOKEN_KEY)
  },

  async getPersistedRefreshToken(): Promise<string | null> {
    return getToken(SECURE_REFRESH_TOKEN_KEY, LEGACY_REFRESH_TOKEN_KEY)
  },

  async setTokens(
    accessToken: string,
    refreshToken: string,
    persistence: TokenPersistence = "persistent",
  ): Promise<void> {
    if (persistence === "ephemeral") {
      ephemeralTokens = { accessToken, refreshToken }
      await clearPersistedTokens()
      return
    }

    ephemeralTokens = null
    if (await canUseSecureStore()) {
      await Promise.all([
        SecureStore.setItemAsync(SECURE_ACCESS_TOKEN_KEY, accessToken),
        SecureStore.setItemAsync(SECURE_REFRESH_TOKEN_KEY, refreshToken),
        AsyncStorage.multiRemove([
          LEGACY_ACCESS_TOKEN_KEY,
          LEGACY_REFRESH_TOKEN_KEY,
        ]),
      ])
      return
    }

    await AsyncStorage.multiSet([
      [LEGACY_ACCESS_TOKEN_KEY, accessToken],
      [LEGACY_REFRESH_TOKEN_KEY, refreshToken],
    ])
  },

  async clearTokens(): Promise<void> {
    ephemeralTokens = null
    await clearPersistedTokens()
  },

  async clearPersistedTokens(): Promise<void> {
    await clearPersistedTokens()
  },
}
