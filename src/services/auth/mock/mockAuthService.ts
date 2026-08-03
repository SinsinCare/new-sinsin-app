import type { IAuthService, AppUser } from "../../types/serviceTypes"
import type {
  AuthProfile,
  SignupRequest,
  SocialSignupRequest,
} from "../../../types"
import { MockUser, DEFAULT_MOCK_USER } from "./mockUser"
import { appConfig } from "../../../config/appConfig"
import { ApiError } from "../../core/apiError"
import i18n from "@/src/i18n"

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
      /*
        서버와 **같은 모양**으로 던진다. 평범한 `Error` 를 던지면 코드가 없어서
        `resolveError` 가 갈래를 못 고르고 `transport.unknown`("지금은 이 작업을
        마치지 못했어요")으로 떨어진다 — mock 로그인에서만 비밀번호 오류가 일반
        문구로 보이는 상태가 되고, 그러면 mock 으로 문구를 확인할 수가 없다.
      */
      throw new ApiError(
        i18n.t("code.LOGIN_ERROR_001.title", { ns: "errors" }),
        "LOGIN_ERROR_001",
        401,
      )
    }
    currentUser = userData.user
    return {
      user: currentUser,
      accountState: "ACTIVE",
      requiresAdditionalInfo: false,
    }
  },

  async signInWithSocial(
    provider: "google" | "apple" | "kakao",
    _idToken: string,
    email?: string | null,
    displayName?: string | null,
  ): Promise<{
    user: AppUser
    accountState: string
    requiresAdditionalInfo: boolean
  }> {
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

  async completeSocialSignup(_request: SocialSignupRequest): Promise<{
    user: AppUser
    accountState: string
    requiresAdditionalInfo: boolean
  }> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    currentUser = new MockUser(`mock-social-${Date.now()}`, null, null)
    return {
      user: currentUser,
      accountState: "PENDING_PROFILE",
      requiresAdditionalInfo: false,
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
  },

  async promoteSession() {
    currentUser = currentUser ?? DEFAULT_MOCK_USER
    return {
      user: currentUser,
      accountState: "ACTIVE",
      requiresAdditionalInfo: false,
      entryGate: "HOME" as const,
      sessionPersistence: "persistent" as const,
    }
  },

  async restoreSession(): Promise<{
    user: AppUser
    accountState: string
    requiresAdditionalInfo: boolean
  } | null> {
    await new Promise((resolve) => setTimeout(resolve, 200))
    if (currentUser) {
      return {
        user: currentUser,
        accountState: "ACTIVE",
        requiresAdditionalInfo: false,
      }
    }
    return null
  },
}
