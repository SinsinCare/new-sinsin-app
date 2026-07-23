// OTP 인증 결과
export interface OtpVerifyResult {
  signupToken: string
}

export type AcquisitionSource =
  | "APP_STORE"
  | "HOSPITAL"
  | "BLOG"
  | "NAVER_CAFE"
  | "DANGGEUN_COMMUNITY"
  | "KAKAO"
  | "YOUTUBE"
  | "INSTAGRAM"
  | "FRIEND"
  | "OTHER"

// 회원가입 요청
export interface SignupRequest {
  signupToken: string
  termsOfServiceAgree: boolean
  privacyPolicyAgree: boolean
  marketingAgree: boolean
  phoneNumber: string
  password: string
  name: string
  birthYear: number
  birthMonth: number
  birthDay: number
  recommender: string
  nickName: string
  gender: "MALE" | "FEMALE" | "OTHER"
  acquisitionSource: AcquisitionSource
  acquisitionSourceOther?: string | null
}

export type AccountState =
  | "PENDING_PROFILE"
  | "PENDING_ONBOARDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "WITHDRAWAL_PENDING"

export type SocialProvider = "google" | "apple" | "kakao"
export type EntryGate = "HOME" | "PROFILE" | "ONBOARDING"
export type SessionPersistence = "persistent" | "ephemeral"

// 회원가입 결과
export interface SignupResult {
  accountState: AccountState
  accessToken: string
  refreshToken: string
  user: AuthUserSummary
  requiresAdditionalInfo: boolean
  entryGate?: EntryGate
  sessionPersistence?: SessionPersistence
}

export interface AuthUserSummary {
  id: number
  email: string
  nickName: string
  name: string
  role: string
  accountState: AccountState
  requiresAdditionalInfo: boolean
}

// 로그인 결과
export interface LoginResult {
  accountState: AccountState
  accessToken: string
  refreshToken: string
  user: AuthUserSummary
  requiresAdditionalInfo: boolean
  entryGate?: EntryGate
  sessionPersistence?: SessionPersistence
}

export interface AuthProfile {
  userId: number
  email: string
  nickName: string
  name: string
  birthYear: number
  birthMonth: number
  birthDay: number
  accountState: AccountState
  gender: "MALE" | "FEMALE" | "OTHER" | null
  profileImage?: string | null
  acquisitionSource?: SignupRequest["acquisitionSource"] | null
  acquisitionSourceOther?: string | null
  requiresAdditionalInfo: boolean
  hasPhoneNumber?: boolean
  phoneNumberMasked?: string | null
}

export interface ProfileCompleteRequest {
  name: string
  birthYear: number
  birthMonth: number
  birthDay: number
  gender: "MALE" | "FEMALE" | "OTHER"
  phoneNumber: string
  acquisitionSource: SignupRequest["acquisitionSource"]
  acquisitionSourceOther?: string | null
  recommender?: string
}

export interface ProfileCompleteResult {
  accountState: AccountState
  profile: AuthProfile
}

export interface SocialLinkRequiredResult {
  provider: SocialProvider
  socialLinkToken: string
}

export interface SocialSignupConsentRequiredResult {
  status: "SOCIAL_CONSENT_REQUIRED"
  provider: SocialProvider
  socialSignupToken: string
}

export interface SocialSignupRequest {
  socialSignupToken: string
  termsOfServiceAgree: boolean
  privacyPolicyAgree: boolean
  marketingAgree: boolean
  phoneNumber?: string
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
  requiresAdditionalInfo: boolean
  entryGate?: EntryGate
  sessionPersistence?: SessionPersistence
}

export interface WithdrawalPendingResult {
  cancelToken: string
  withdrawalDueAt: string | null
}
