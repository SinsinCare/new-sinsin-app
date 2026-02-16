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

// 회원가입 결과
export interface SignupResult {
  accessToken: string
  refreshToken: string
}

// 로그인 결과
export interface LoginResult {
  accountState: string
  accessToken: string
  refreshToken: string
}

// 토큰 갱신 결과
export interface TokenRefreshResult {
  accountState: string
  accessToken: string
  refreshToken: string
}
