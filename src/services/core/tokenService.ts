import AsyncStorage from "@react-native-async-storage/async-storage"
import * as SecureStore from "expo-secure-store"

const SECURE_ACCESS_TOKEN_KEY = "sinsin.accessToken"
const SECURE_REFRESH_TOKEN_KEY = "sinsin.refreshToken"
const LEGACY_ACCESS_TOKEN_KEY = "@sinsin/accessToken"
const LEGACY_REFRESH_TOKEN_KEY = "@sinsin/refreshToken"

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}

type TokenPersistence = "persistent" | "ephemeral"
type Tokens = { accessToken: string; refreshToken: string }

let persistentTokens: Tokens | null = null
let ephemeralTokens: Tokens | null = null
let restorableRefreshToken: string | null = null
let hydrated = false
let hydrationPromise: Promise<void> | null = null
let secureStoreAvailable: Promise<boolean> | null = null
let tokenMutationQueue: Promise<void> = Promise.resolve()

function serializeTokenMutation<T>(operation: () => Promise<T>): Promise<T> {
  const result = tokenMutationQueue.then(operation, operation)
  tokenMutationQueue = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

async function canUseSecureStore(): Promise<boolean> {
  secureStoreAvailable ??= SecureStore.isAvailableAsync().catch(() => false)
  return secureStoreAvailable
}

function completePair(
  accessToken: string | null,
  refreshToken: string | null,
): Tokens | null {
  return accessToken && refreshToken ? { accessToken, refreshToken } : null
}

async function readLegacyTokens(): Promise<Tokens | null> {
  const values = new Map(
    await AsyncStorage.multiGet([
      LEGACY_ACCESS_TOKEN_KEY,
      LEGACY_REFRESH_TOKEN_KEY,
    ]),
  )
  return completePair(
    values.get(LEGACY_ACCESS_TOKEN_KEY) ?? null,
    values.get(LEGACY_REFRESH_TOKEN_KEY) ?? null,
  )
}

async function removeLegacyTokens(): Promise<void> {
  await AsyncStorage.multiRemove([
    LEGACY_ACCESS_TOKEN_KEY,
    LEGACY_REFRESH_TOKEN_KEY,
  ])
}

async function deleteSecureTokens(): Promise<void> {
  if (!(await canUseSecureStore())) return
  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(SECURE_REFRESH_TOKEN_KEY),
  ])
}

async function writeSecureTokens(tokens: Tokens): Promise<void> {
  try {
    await Promise.all([
      SecureStore.setItemAsync(
        SECURE_ACCESS_TOKEN_KEY,
        tokens.accessToken,
        SECURE_STORE_OPTIONS,
      ),
      SecureStore.setItemAsync(
        SECURE_REFRESH_TOKEN_KEY,
        tokens.refreshToken,
        SECURE_STORE_OPTIONS,
      ),
    ])
  } catch (error) {
    // 한 키만 기록된 상태를 다음 실행에서 유효한 세션으로 오인하지 않는다.
    await deleteSecureTokens().catch(() => undefined)
    throw error
  }
}

async function hydrateTokens(): Promise<void> {
  if (hydrated) return
  if (hydrationPromise) return hydrationPromise

  const pending = (async () => {
    const secureAvailable = await canUseSecureStore()
    if (secureAvailable) {
      const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(SECURE_ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(SECURE_REFRESH_TOKEN_KEY),
      ])
      const secureTokens = completePair(accessToken, refreshToken)
      if (secureTokens) {
        persistentTokens = secureTokens
        restorableRefreshToken = secureTokens.refreshToken
        // 예전 평문 복사본이 남아 있어도 SecureStore 값을 정본으로 삼고 지운다.
        await removeLegacyTokens()
        return
      }
      if (accessToken || refreshToken) await deleteSecureTokens()
    }

    const legacyTokens = await readLegacyTokens()
    if (!legacyTokens) {
      // 부분 저장된 레거시 토큰도 인증에 쓸 수 없으므로 남기지 않는다.
      await removeLegacyTokens()
      return
    }

    if (secureAvailable) {
      // 두 secure write가 끝난 뒤에만 평문 원본을 지운다.
      await writeSecureTokens(legacyTokens)
      persistentTokens = legacyTokens
    } else {
      // SecureStore가 없는 플랫폼에서 평문 저장으로 되돌아가지 않는다.
      ephemeralTokens = legacyTokens
    }
    restorableRefreshToken = legacyTokens.refreshToken
    await removeLegacyTokens()
  })()
  hydrationPromise = pending
    .then(() => {
      hydrated = true
    })
    .finally(() => {
      hydrationPromise = null
    })

  return hydrationPromise
}

async function clearPersistedTokens(): Promise<void> {
  // 로그아웃은 SecureStore 읽기가 실패한 상황에서도 삭제를 시도해야 한다. 이미 진행 중인
  // hydration만 기다려, 삭제 직후 늦은 read가 메모리 토큰을 되살리는 경합을 막는다.
  if (hydrationPromise) await hydrationPromise.catch(() => undefined)
  persistentTokens = null
  restorableRefreshToken = null
  hydrated = true
  await Promise.all([deleteSecureTokens(), removeLegacyTokens()])
}

function currentTokens(): Tokens | null {
  return ephemeralTokens ?? persistentTokens
}

export const tokenService = {
  async getAccessToken(): Promise<string | null> {
    await hydrateTokens()
    return currentTokens()?.accessToken ?? null
  },

  async getRefreshToken(): Promise<string | null> {
    await hydrateTokens()
    return currentTokens()?.refreshToken ?? null
  },

  async getPersistedRefreshToken(): Promise<string | null> {
    await hydrateTokens()
    return restorableRefreshToken
  },

  async setTokens(
    accessToken: string,
    refreshToken: string,
    persistence: TokenPersistence = "persistent",
  ): Promise<void> {
    await serializeTokenMutation(async () => {
      await hydrateTokens()
      const next = { accessToken, refreshToken }
      if (persistence === "ephemeral") {
        ephemeralTokens = next
        await clearPersistedTokens()
        return
      }

      if (await canUseSecureStore()) {
        await writeSecureTokens(next)
        persistentTokens = next
        ephemeralTokens = null
        restorableRefreshToken = refreshToken
        await removeLegacyTokens()
        return
      }

      // 기기 보안 저장소를 쓸 수 없으면 세션을 메모리에만 둔다. 토큰을 평문으로
      // 영속화하는 것보다 다음 실행에서 다시 로그인하는 편이 안전하다.
      persistentTokens = null
      ephemeralTokens = next
      restorableRefreshToken = null
      await removeLegacyTokens()
    })
  },

  async clearTokens(): Promise<void> {
    await serializeTokenMutation(async () => {
      ephemeralTokens = null
      await clearPersistedTokens()
    })
  },

  async clearPersistedTokens(): Promise<void> {
    await serializeTokenMutation(clearPersistedTokens)
  },
}
