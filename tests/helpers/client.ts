import { createHash } from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import axios, { type AxiosInstance, type AxiosResponse } from "axios"

/** TEST_BASE_URL이 있으면 그것을, 없으면 앱의 `EXPO_PUBLIC_BACKEND_URL`을 기준 URL로 사용 */
const configuredBaseUrl =
  process.env.TEST_BASE_URL || process.env.EXPO_PUBLIC_BACKEND_URL

if (!configuredBaseUrl) {
  throw new Error(
    "TEST_BASE_URL 또는 EXPO_PUBLIC_BACKEND_URL을 gitignored env 파일에 설정해주세요.",
  )
}

export const BASE_URL = configuredBaseUrl

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

type TestSession = {
  accessToken: string
  refreshToken: string
  accountState: string
}

/*
  로그인 세션은 **파일로 캐시**해 jest 워커와 연속 실행 사이에 재사용한다.

  서버는 `/auth/login` 을 계정당 5분에 10회로 막는다(`sinsin-be-bun/src/http/rateLimit.ts`
  `AUTH_RATE_LIMIT_RULES`). API 스위트 넷(auth·profile·chat·food)이 각자 워커에서 같은
  계정으로 로그인하면 한 번의 전체 실행에 7회가 나가고, 5분 안에 두 번 돌리면 429 로
  `beforeAll` 이 죽어 스위트째 사라진다(2026-09-09 실측). 워커는 프로세스가 달라 메모리
  캐시로는 못 나누므로 OS 임시 디렉터리의 파일을 쓴다. 재사용 전에 `/user/profile` 로 한 번
  찔러 세션이 살아 있는지 본다 — 서버 재시작(JWT 비밀 교체)이나 로그아웃 뒤의 죽은 토큰을
  그대로 믿으면 인증 필요 테스트가 전부 거짓 실패한다.
*/
const SESSION_CACHE_TTL_MS = 10 * 60 * 1000

function sessionCachePath(email: string): string {
  const id = createHash("sha1").update(`${BASE_URL}\n${email}`).digest("hex")
  return path.join(os.tmpdir(), `sinsin-rn-api-test-session-${id}.json`)
}

function readCachedSession(email: string): TestSession | null {
  try {
    const file = sessionCachePath(email)
    const stat = fs.statSync(file)
    if (Date.now() - stat.mtimeMs > SESSION_CACHE_TTL_MS) return null
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as TestSession
    if (!parsed.accessToken || !parsed.refreshToken) return null
    return parsed
  } catch {
    return null
  }
}

function writeCachedSession(email: string, session: TestSession): void {
  try {
    fs.writeFileSync(sessionCachePath(email), JSON.stringify(session))
  } catch {
    // 캐시는 최적화일 뿐이다 — 못 쓰면 다음 호출이 다시 로그인한다.
  }
}

async function sessionIsAlive(accessToken: string): Promise<boolean> {
  try {
    const res = await publicClient.get("/user/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
      validateStatus: () => true,
    })
    return res.status === 200 && res.data?.isSuccess === true
  } catch {
    return false
  }
}

async function loginFresh(
  email: string,
  password: string,
): Promise<TestSession> {
  const res: AxiosResponse = await publicClient.post("/auth/login", {
    email,
    password,
  })
  const { accessToken, refreshToken, accountState } = res.data.result
  return { accessToken, refreshToken, accountState }
}

function requireCredentials(): { email: string; password: string } {
  const email = process.env.TEST_EMAIL
  const password = process.env.TEST_PASSWORD
  if (!email || !password) {
    throw new Error(
      "TEST_EMAIL, TEST_PASSWORD를 프로젝트 루트 .env 또는 tests/.env.test 에 설정해주세요. (tests/.env.test.example 참고)",
    )
  }
  return { email, password }
}

/*
  워커 넷이 동시에 시작하면 캐시가 비어 있어 넷 다 로그인한다 — 한도의 40% 를 첫 순간에
  쓴다. 디렉터리 생성은 원자적이라 잠금으로 쓴다: 먼저 잡은 워커만 로그인하고, 나머지는
  캐시 파일이 생길 때까지 잠깐 기다린다. 잠금이 오래 남으면(죽은 워커) 그냥 로그인한다.
*/
const LOGIN_LOCK_WAIT_MS = 15_000
const LOGIN_LOCK_STALE_MS = 60_000

function loginLockPath(email: string): string {
  return `${sessionCachePath(email)}.lock`
}

function acquireLoginLock(email: string): boolean {
  const lock = loginLockPath(email)
  try {
    fs.mkdirSync(lock)
    return true
  } catch {
    try {
      if (Date.now() - fs.statSync(lock).mtimeMs > LOGIN_LOCK_STALE_MS) {
        fs.rmSync(lock, { recursive: true, force: true })
        fs.mkdirSync(lock)
        return true
      }
    } catch {
      // 다른 워커가 먼저 잡았거나 방금 놓았다 — 아래 대기로 간다.
    }
    return false
  }
}

function releaseLoginLock(email: string): void {
  fs.rmSync(loginLockPath(email), { recursive: true, force: true })
}

async function waitForCachedSession(
  email: string,
): Promise<TestSession | null> {
  const deadline = Date.now() + LOGIN_LOCK_WAIT_MS
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 250))
    const cached = readCachedSession(email)
    if (cached) return cached
  }
  return null
}

/** 캐시를 건너뛰고 새로 로그인한다 — 방금 발급된 refreshToken 이 필요한 테스트용. */
export async function loginAsTestUserFresh(): Promise<TestSession> {
  const { email, password } = requireCredentials()
  const session = await loginFresh(email, password)
  tokenStore.setTokens(session.accessToken, session.refreshToken)
  writeCachedSession(email, session)
  return session
}

// 테스트 계정으로 로그인하고 토큰 저장 (캐시된 세션이 살아 있으면 그것을 쓴다)
export async function loginAsTestUser(): Promise<TestSession> {
  const { email, password } = requireCredentials()

  const cached = readCachedSession(email)
  if (cached && (await sessionIsAlive(cached.accessToken))) {
    tokenStore.setTokens(cached.accessToken, cached.refreshToken)
    return cached
  }

  if (!acquireLoginLock(email)) {
    const shared = await waitForCachedSession(email)
    if (shared && (await sessionIsAlive(shared.accessToken))) {
      tokenStore.setTokens(shared.accessToken, shared.refreshToken)
      return shared
    }
  }
  try {
    const session = await loginFresh(email, password)
    tokenStore.setTokens(session.accessToken, session.refreshToken)
    writeCachedSession(email, session)
    return session
  } finally {
    releaseLoginLock(email)
  }
}

// 응답이 성공 형식인지 확인
export function assertSuccess(data: { isSuccess: boolean }) {
  expect(data.isSuccess).toBe(true)
}
