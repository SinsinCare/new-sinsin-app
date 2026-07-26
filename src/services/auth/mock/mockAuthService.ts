import type {
  IAuthService,
  AppUser,
  AuthSessionResult,
} from "../../types/serviceTypes"
import type {
  AuthProfile,
  SignupRequest,
  SocialSignupRequest,
} from "../../../types"
import { MockUser, DEFAULT_MOCK_USER } from "./mockUser"
import { appConfig } from "../../../config/appConfig"
import {
  clearMockAuthSession,
  persistMockAuthSession,
  restoreMockAuthSession,
} from "./mockAuthSessionFixture"

const mockUsers = new Map<
  string,
  { email: string; password: string; user: MockUser }
>([
  [
    "test@sinsin.dev",
    { email: "test@sinsin.dev", password: "test1234", user: DEFAULT_MOCK_USER },
  ],
])

let currentUser: MockUser | null = appConfig.mockNoUser
  ? null
  : DEFAULT_MOCK_USER

export const mockAuthService: IAuthService = {
  async signInWithEmail(
    email: string,
    password: string,
  ): Promise<{
    user: AppUser
    accountState: string
    requiresAdditionalInfo: boolean
  }> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const userData = mockUsers.get(email)
    if (!userData || userData.password !== password) {
      throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.")
    }
    currentUser = userData.user
    const session = {
      user: currentUser,
      accountState: "ACTIVE",
      requiresAdditionalInfo: false,
      entryGate: "HOME" as const,
      sessionPersistence: "persistent" as const,
    }
    await persistMockAuthSession(session)
    return session
  },

  async signInWithSocial(
    provider: "google" | "apple" | "kakao",
    _idToken: string,
    email?: string | null,
    displayName?: string | null,
  ): Promise<AuthSessionResult> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const mockUser = new MockUser(
      `mock-${provider}-${Date.now()}`,
      email ?? null,
      displayName ?? null,
    )
    currentUser = mockUser
    return {
      user: currentUser,
      accountState: "PENDING_ONBOARDING",
      requiresAdditionalInfo: false,
      entryGate: "ONBOARDING" as const,
      sessionPersistence: "ephemeral" as const,
    }
  },

  async sendSocialLinkEmailCode(
    _socialLinkToken: string,
    _email: string,
  ): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 300))
  },

  async verifySocialLinkEmailCode(
    _socialLinkToken: string,
    email: string,
    _code: string,
  ): Promise<{
    user: AppUser
    accountState: string
    requiresAdditionalInfo: boolean
  }> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    currentUser = new MockUser(`mock-linked-${Date.now()}`, email, null)
    return {
      user: currentUser,
      accountState: "PENDING_ONBOARDING",
      requiresAdditionalInfo: false,
    }
  },

  async completeEmailLoginLink(
    _emailLinkToken: string,
    _password: string,
  ): Promise<{
    user: AppUser
    accountState: string
    requiresAdditionalInfo: boolean
  }> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    currentUser = DEFAULT_MOCK_USER
    return {
      user: currentUser,
      accountState: "ACTIVE",
      requiresAdditionalInfo: false,
    }
  },

  async completeProfile(): Promise<{
    user: AppUser
    accountState: string
    requiresAdditionalInfo: boolean
  }> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    currentUser = currentUser ?? DEFAULT_MOCK_USER
    return {
      user: currentUser,
      accountState: "PENDING_ONBOARDING",
      requiresAdditionalInfo: false,
    }
  },

  async getProfile(): Promise<AuthProfile> {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return {
      userId: Number(currentUser?.uid ?? 1),
      email: currentUser?.email ?? "test@sinsin.dev",
      nickName: currentUser?.displayName ?? "테스터",
      name: currentUser?.displayName ?? "테스트",
      birthYear: 1990,
      birthMonth: 1,
      birthDay: 1,
      accountState: "ACTIVE",
      gender: "FEMALE",
      profileImage: null,
      acquisitionSource: null,
      acquisitionSourceOther: null,
      requiresAdditionalInfo: true,
    }
  },

  async signup(request: SignupRequest) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const newUser = new MockUser(
      `mock-user-${Date.now()}`,
      null,
      request.nickName,
    )
    currentUser = newUser
    return {
      user: currentUser,
      accountState: "PENDING_ONBOARDING",
      requiresAdditionalInfo: false,
      entryGate: "ONBOARDING" as const,
      sessionPersistence: "ephemeral" as const,
    }
  },

  async completeSocialSignup(
    _request: SocialSignupRequest,
  ): Promise<AuthSessionResult> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    currentUser = new MockUser(`mock-social-${Date.now()}`, null, null)
    return {
      user: currentUser,
      accountState: "PENDING_PROFILE",
      requiresAdditionalInfo: false,
      entryGate: "PROFILE" as const,
      sessionPersistence: "ephemeral" as const,
    }
  },

  async cancelWithdrawal(_cancelToken: string): Promise<{
    user: AppUser
    accountState: string
    requiresAdditionalInfo: boolean
  }> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    currentUser = DEFAULT_MOCK_USER
    return {
      user: currentUser,
      accountState: "ACTIVE",
      requiresAdditionalInfo: false,
    }
  },

  async signOut(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    currentUser = null
    await clearMockAuthSession()
  },

  async promoteSession() {
    currentUser = currentUser ?? DEFAULT_MOCK_USER
    const session = {
      user: currentUser,
      accountState: "ACTIVE",
      requiresAdditionalInfo: false,
      entryGate: "HOME" as const,
      sessionPersistence: "persistent" as const,
    }
    await persistMockAuthSession(session)
    return session
  },

  async restoreSession(): Promise<AuthSessionResult | null> {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const persistedSession = await restoreMockAuthSession()
    if (persistedSession) {
      currentUser = new MockUser(
        persistedSession.user.uid,
        persistedSession.user.email,
        persistedSession.user.displayName,
      )
      return {
        user: currentUser,
        accountState: persistedSession.accountState,
        requiresAdditionalInfo: persistedSession.requiresAdditionalInfo,
        entryGate: persistedSession.entryGate,
        sessionPersistence: persistedSession.sessionPersistence,
      }
    }
    return null
  },
}
