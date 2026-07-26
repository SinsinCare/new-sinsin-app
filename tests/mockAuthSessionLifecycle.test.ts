const storage = new Map<string, string>()
const appConfig = { mockNoUser: true }

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => storage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      storage.set(key, value)
    }),
    removeItem: jest.fn(async (key: string) => {
      storage.delete(key)
    }),
  },
}))

jest.mock("../src/config/appConfig", () => ({
  appConfig,
}))
const loadMockAuth = () => {
  jest.resetModules()
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../src/services/auth/mock") as typeof import("../src/services/auth/mock")
}

describe("mock auth session fixture lifecycle", () => {
  beforeEach(async () => {
    storage.clear()
    appConfig.mockNoUser = true
    const { resetMockAuthSessionFixture } = loadMockAuth()
    await resetMockAuthSessionFixture()
  })

  it("restores a persistent email login after an app process relaunch", async () => {
    const firstLaunch = loadMockAuth()
    const signedIn = await firstLaunch.mockAuthService.signInWithEmail(
      "test@sinsin.dev",
      "test1234",
    )

    const relaunched = loadMockAuth()
    await expect(relaunched.mockAuthService.restoreSession()).resolves.toEqual(
      signedIn,
    )
  })

  it("does not restore an ephemeral signup before promotion", async () => {
    const firstLaunch = loadMockAuth()
    const signup = await firstLaunch.mockAuthService.signup({
      signupToken: "mock-signup-token",
      termsOfServiceAgree: true,
      privacyPolicyAgree: true,
      marketingAgree: false,
      phoneNumber: "01012345678",
      password: "test1234",
      name: "새 사용자",
      birthYear: 1990,
      birthMonth: 1,
      birthDay: 1,
      recommender: "",
      nickName: "새 사용자",
      gender: "OTHER",
      acquisitionSource: "APP_STORE",
    })
    expect(signup.sessionPersistence).toBe("ephemeral")

    const relaunched = loadMockAuth()
    await expect(
      relaunched.mockAuthService.restoreSession(),
    ).resolves.toBeNull()
  })

  it("does not restore an ephemeral social session before promotion", async () => {
    const firstLaunch = loadMockAuth()
    const social = await firstLaunch.mockAuthService.signInWithSocial(
      "google",
      "mock-id-token",
      "social@example.test",
      "소셜 사용자",
    )
    if ("status" in social) throw new Error("unexpected social consent result")
    expect(social.sessionPersistence).toBe("ephemeral")

    const relaunched = loadMockAuth()
    await expect(
      relaunched.mockAuthService.restoreSession(),
    ).resolves.toBeNull()
  })

  it("does not persist an ephemeral fixture passed directly to the helper", async () => {
    const firstLaunch = loadMockAuth()
    await firstLaunch.persistMockAuthSession({
      user: {
        uid: "ephemeral-user",
        email: "ephemeral@example.test",
        displayName: null,
      },
      accountState: "PENDING_ONBOARDING",
      requiresAdditionalInfo: false,
      entryGate: "ONBOARDING",
      sessionPersistence: "ephemeral",
    })

    const relaunched = loadMockAuth()
    await expect(
      relaunched.mockAuthService.restoreSession(),
    ).resolves.toBeNull()
  })

  it("preserves the default mock user when mockNoUser is disabled", async () => {
    appConfig.mockNoUser = false
    const defaultMockLaunch = loadMockAuth()

    await expect(
      defaultMockLaunch.mockAuthService.restoreSession(),
    ).resolves.toMatchObject({
      user: { uid: "mock-user-001" },
      accountState: "ACTIVE",
      entryGate: "HOME",
    })
  })

  it("isolates persistent fixtures by user ID and resets deterministically", async () => {
    const firstLaunch = loadMockAuth()
    await firstLaunch.persistMockAuthSession({
      user: { uid: "user-a", email: "a@example.test", displayName: "A" },
      accountState: "ACTIVE",
      requiresAdditionalInfo: false,
      entryGate: "HOME",
      sessionPersistence: "persistent",
    })
    await firstLaunch.persistMockAuthSession({
      user: { uid: "user-b", email: "b@example.test", displayName: "B" },
      accountState: "ACTIVE",
      requiresAdditionalInfo: false,
      entryGate: "HOME",
      sessionPersistence: "persistent",
    })

    await expect(firstLaunch.restoreMockAuthSession()).resolves.toMatchObject({
      user: { uid: "user-b" },
    })

    await firstLaunch.resetMockAuthSessionFixture()
    await expect(firstLaunch.restoreMockAuthSession()).resolves.toBeNull()
  })
})
