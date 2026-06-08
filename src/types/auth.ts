// OTP 인증 결과
export interface OtpVerifyResult {
  signupToken: string
}

// 회원가입 요청
export interface SignupRequest {
  signupToken: string
  termsOfServiceAgree: boolean
  privacyPolicyAgree: boolean
  marketingAgree: boolean
  password: string
  name: string
  birthYear: number
  birthMonth: number
  birthDay: number
  recommender: string
  nickName: string
}

export type AccountState =
  | "PENDING_ONBOARDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "WITHDRAWAL_PENDING"

export type SocialProvider = "google" | "apple" | "kakao"

// 회원가입 결과
export interface SignupResult {
  accountState: AccountState
  accessToken: string
  refreshToken: string
  user: AuthUserSummary
}

export interface AuthUserSummary {
  id: number
  email: string
  nickName: string
  name: string
  role: string
  accountState: AccountState
}

// 로그인 결과
export interface LoginResult {
  accountState: AccountState
  accessToken: string
  refreshToken: string
  user: AuthUserSummary
}

export interface SocialLinkRequiredResult {
  provider: SocialProvider
  socialLinkToken: string
}

export interface EmailLoginLinkRequiredResult {
  email: string
  providers: SocialProvider[]
}

export interface EmailLoginLinkOtpVerifyResult {
  email: string
  emailLinkToken: string
}

// 토큰 갱신 결과
export interface TokenRefreshResult {
  accountState: AccountState
  accessToken: string
  refreshToken: string
  user: AuthUserSummary
}

export interface WithdrawalPendingResult {
  cancelToken: string
  withdrawalDueAt: string | null
}
