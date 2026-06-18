import type {
  ProfileCompleteRequest,
  SignupRequest,
  SocialProvider,
} from "../../types"

// 앱 사용자 최소 인터페이스
export interface AppUser {
  uid: string
  email: string | null
  displayName: string | null
}

// 인증 서비스 인터페이스
export interface IAuthService {
  signInWithEmail(
    email: string,
    password: string,
  ): Promise<{ user: AppUser; accountState: string }>
  signInWithSocial(
    provider: SocialProvider,
    idToken: string,
    email?: string | null,
    displayName?: string | null,
  ): Promise<{ user: AppUser; accountState: string }>
  sendSocialLinkEmailCode(socialLinkToken: string, email: string): Promise<void>
  verifySocialLinkEmailCode(
    socialLinkToken: string,
    email: string,
    code: string,
  ): Promise<{ user: AppUser; accountState: string }>
  completeEmailLoginLink(
    emailLinkToken: string,
    password: string,
  ): Promise<{ user: AppUser; accountState: string }>
  completeProfile(
    request: ProfileCompleteRequest,
  ): Promise<{ user: AppUser; accountState: string }>
  signup(request: SignupRequest): Promise<AppUser>
  cancelWithdrawal(
    cancelToken: string,
  ): Promise<{ user: AppUser; accountState: string }>
  signOut(): Promise<void>
  restoreSession(): Promise<{ user: AppUser; accountState: string } | null>
}
