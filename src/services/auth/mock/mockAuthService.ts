import type { IAuthService, AppUser } from "../../types/serviceTypes"
import type { SignupRequest } from "../../../types"
import { MockUser, DEFAULT_MOCK_USER } from "./mockUser"
import { appConfig } from "../../../config/appConfig"

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
  ): Promise<{ user: AppUser; accountState: string }> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const userData = mockUsers.get(email)
    if (!userData || userData.password !== password) {
      throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.")
    }
    currentUser = userData.user
    return { user: currentUser, accountState: "ACTIVE" }
  },

  async signInWithSocial(
    provider: "google" | "apple" | "kakao",
    _idToken: string,
    email?: string | null,
    displayName?: string | null,
  ): Promise<{ user: AppUser; accountState: string }> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const mockUser = new MockUser(
      `mock-${provider}-${Date.now()}`,
      email ?? null,
      displayName ?? null,
    )
    currentUser = mockUser
    return { user: currentUser, accountState: "PENDING_ONBOARDING" }
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
  ): Promise<{ user: AppUser; accountState: string }> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    currentUser = new MockUser(`mock-linked-${Date.now()}`, email, null)
    return { user: currentUser, accountState: "PENDING_ONBOARDING" }
  },

  async signup(request: SignupRequest): Promise<AppUser> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const newUser = new MockUser(
      `mock-user-${Date.now()}`,
      null,
      request.nickName,
    )
    currentUser = newUser
    return currentUser
  },

  async cancelWithdrawal(
    _cancelToken: string,
  ): Promise<{ user: AppUser; accountState: string }> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    currentUser = DEFAULT_MOCK_USER
    return { user: currentUser, accountState: "ACTIVE" }
  },

  async signOut(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    currentUser = null
  },

  async restoreSession(): Promise<{
    user: AppUser
    accountState: string
  } | null> {
    await new Promise((resolve) => setTimeout(resolve, 200))
    if (currentUser) {
      return { user: currentUser, accountState: "ACTIVE" }
    }
    return null
  },
}
