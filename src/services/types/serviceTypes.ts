import type {
  ProfileCompleteRequest,
  SignupRequest,
  SocialProvider,
  AuthProfile,
} from "../../types"

// 앱 사용자 최소 인터페이스
export interface AppUser {
  uid: string
  email: string | null
  displayName: string | null
}

export interface AuthSessionResult {
  user: AppUser
  accountState: string
  requiresAdditionalInfo: boolean
}

// 인증 서비스 인터페이스
export interface IAuthService {
  signInWithEmail(
    email: string,
    password: string,
  ): Promise<AuthSessionResult>
  signInWithSocial(
    provider: SocialProvider,
    idToken: string,
    email?: string | null,
    displayName?: string | null,
  ): Promise<AuthSessionResult>
  sendSocialLinkEmailCode(socialLinkToken: string, email: string): Promise<void>
  verifySocialLinkEmailCode(
    socialLinkToken: string,
    email: string,
    code: string,
  ): Promise<AuthSessionResult>
  completeEmailLoginLink(
    emailLinkToken: string,
    password: string,
  ): Promise<AuthSessionResult>
  completeProfile(
    request: ProfileCompleteRequest,
  ): Promise<AuthSessionResult>
  getProfile(): Promise<AuthProfile>
  signup(request: SignupRequest): Promise<AppUser>
  cancelWithdrawal(
    cancelToken: string,
  ): Promise<AuthSessionResult>
  signOut(): Promise<void>
  restoreSession(): Promise<AuthSessionResult | null>
}
