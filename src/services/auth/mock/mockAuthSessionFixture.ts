import AsyncStorage from "@react-native-async-storage/async-storage"

import type { AppUser, AuthSessionResult } from "../../types/serviceTypes"

const STORAGE_KEY = "@sinsin/mock-auth/session-fixture/v1"

type PersistedMockSession = Required<
  Pick<
    AuthSessionResult,
    | "accountState"
    | "requiresAdditionalInfo"
    | "entryGate"
    | "sessionPersistence"
  >
> & {
  user: AppUser
}

type MockSessionFixture = {
  activeUserId: string | null
  sessionsByUserId: Record<string, PersistedMockSession>
}

const emptyFixture = (): MockSessionFixture => ({
  activeUserId: null,
  sessionsByUserId: {},
})

function toPersistedSession(session: AuthSessionResult): PersistedMockSession {
  return {
    ...session,
    entryGate: session.entryGate ?? "HOME",
    sessionPersistence: "persistent",
  }
}

async function readFixture(): Promise<MockSessionFixture> {
  const rawFixture = await AsyncStorage.getItem(STORAGE_KEY)
  if (!rawFixture) return emptyFixture()

  try {
    const fixture = JSON.parse(rawFixture) as MockSessionFixture
    if (
      typeof fixture.activeUserId !== "string" &&
      fixture.activeUserId !== null
    ) {
      return emptyFixture()
    }
    return fixture
  } catch {
    return emptyFixture()
  }
}

/**
 * Mock-only fixture used to emulate a process-safe email login session. It is
 * deliberately separate from the production tokenService storage contract.
 */
export async function persistMockAuthSession(
  session: AuthSessionResult,
): Promise<void> {
  if (session.sessionPersistence !== "persistent") return

  const fixture = await readFixture()
  const persistedSession = toPersistedSession(session)

  fixture.activeUserId = persistedSession.user.uid
  fixture.sessionsByUserId[persistedSession.user.uid] = persistedSession
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fixture))
}

export async function restoreMockAuthSession(): Promise<AuthSessionResult | null> {
  const fixture = await readFixture()
  if (!fixture.activeUserId) return null

  return fixture.sessionsByUserId[fixture.activeUserId] ?? null
}

export async function clearMockAuthSession(): Promise<void> {
  const fixture = await readFixture()
  if (fixture.activeUserId) {
    delete fixture.sessionsByUserId[fixture.activeUserId]
  }
  fixture.activeUserId = null
  if (Object.keys(fixture.sessionsByUserId).length === 0) {
    await AsyncStorage.removeItem(STORAGE_KEY)
    return
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fixture))
}

/** Deterministic test/QA reset for the mock fixture only. */
export async function resetMockAuthSessionFixture(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY)
}
