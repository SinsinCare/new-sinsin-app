import axios, { type AxiosInstance, type AxiosResponse } from "axios"

/** 앱의 `EXPO_PUBLIC_BACKEND_URL`과 동일한 기준 URL 사용 */
export const BASE_URL =
  process.env.TEST_BASE_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "<backend-api-base-url>"

// 인메모리 토큰 저장소 (AsyncStorage 대신)
let _accessToken: string | null = null
let _refreshToken: string | null = null

export const tokenStore = {
  setTokens(access: string, refresh: string) {
    _accessToken = access
    _refreshToken = refresh
  },
  getAccessToken() {
    return _accessToken
  },
  getRefreshToken() {
    return _refreshToken
  },
  clear() {
    _accessToken = null
    _refreshToken = null
  },
}

// 인증 불필요 클라이언트
export const publicClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
})

// 인증 필요 클라이언트 (Authorization 헤더 자동 주입)
export const authClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
})

authClient.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 테스트 계정으로 로그인하고 토큰 저장
export async function loginAsTestUser(): Promise<{
  accessToken: string
  refreshToken: string
  accountState: string
}> {
  const email = process.env.TEST_EMAIL
  const password = process.env.TEST_PASSWORD

  if (!email || !password) {
    throw new Error(
      "TEST_EMAIL, TEST_PASSWORD를 프로젝트 루트 .env 또는 tests/.env.test 에 설정해주세요. (tests/.env.test.example 참고)",
    )
  }

  const res: AxiosResponse = await publicClient.post("/auth/login", {
    email,
    password,
  })

  const { accessToken, refreshToken, accountState } = res.data.result
  tokenStore.setTokens(accessToken, refreshToken)
  return { accessToken, refreshToken, accountState }
}

// 응답이 성공 형식인지 확인
export function assertSuccess(data: { isSuccess: boolean }) {
  expect(data.isSuccess).toBe(true)
}
