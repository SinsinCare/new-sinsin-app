/* eslint-disable import/first */
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}
const mockAppPublicApi = {
  post: jest.fn(),
}
const mockAppApi = {
  get: jest.fn(),
  post: jest.fn(),
}
const mockAppTokenService = {
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  getPersistedRefreshToken: jest.fn(),
  setTokens: jest.fn(),
}
const mockClearClientSession = jest.fn()

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: mockAsyncStorage,
}))

jest.mock("../src/services/core", () => ({
  api: mockAppApi,
  clearClientSession: mockClearClientSession,
  publicApi: mockAppPublicApi,
  tokenService: mockAppTokenService,
}))

jest.mock("../src/config/appConfig", () => ({
  isMockUser: jest.fn(() => false),
}))

jest.mock("../src/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}))

import {
  publicClient,
  authClient,
  loginAsTestUser,
  tokenStore,
  assertSuccess,
} from "./helpers/client"
import { itIfCreds } from "./helpers/testCredentials"
import {
  authService,
  consumeSocialReauthenticationIntent,
  isSocialReauthenticationRequired,
  persistSocialReauthenticationIntentForSignOut,
} from "../src/services/auth/authService"
/* eslint-enable import/first */

const TEST_EMAIL = process.env.TEST_EMAIL ?? ""
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? ""

describe("Auth API", () => {
  afterEach(() => {
    tokenStore.clear()
  })

  // ────────────────────────────────────────────────
  // 로그인
  // ────────────────────────────────────────────────
  describe("POST /auth/login", () => {
    itIfCreds("유효한 자격증명으로 로그인 성공", async () => {
      const res = await publicClient.post("/auth/login", {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      })
      assertSuccess(res.data)
      expect(res.data.result.accessToken).toBeTruthy()
      expect(res.data.result.refreshToken).toBeTruthy()
      expect(typeof res.data.result.accountState).toBe("string")
    })

    itIfCreds("잘못된 비밀번호로 로그인 실패 → 4xx", async () => {
      await expect(
        publicClient.post("/auth/login", {
          email: TEST_EMAIL,
          password: "WrongPassword!999",
        }),
      ).rejects.toMatchObject({
        response: { status: expect.any(Number) },
      })
    })

    itIfCreds("존재하지 않는 이메일로 로그인 실패 → 4xx", async () => {
      await expect(
        publicClient.post("/auth/login", {
          email: "notexist_12345@sinsin.test",
          password: TEST_PASSWORD,
        }),
      ).rejects.toMatchObject({
        response: { status: expect.any(Number) },
      })
    })
  })

  // ────────────────────────────────────────────────
  // 토큰 갱신
  // ────────────────────────────────────────────────
  describe("POST /auth/tokens/refresh", () => {
    itIfCreds("유효한 refreshToken으로 토큰 갱신 성공", async () => {
      const { refreshToken } = await loginAsTestUser()

      const res = await publicClient.post("/auth/tokens/refresh", {
        refreshToken,
      })
      assertSuccess(res.data)
      expect(res.data.result.accessToken).toBeTruthy()
      expect(res.data.result.refreshToken).toBeTruthy()
    })

    it("유효하지 않은 refreshToken → 4xx", async () => {
      await expect(
        publicClient.post("/auth/tokens/refresh", {
          refreshToken: "invalid.token.value",
        }),
      ).rejects.toMatchObject({
        response: { status: expect.any(Number) },
      })
    })
  })

  // ────────────────────────────────────────────────
  // 이메일 중복 확인
  // ────────────────────────────────────────────────
  describe("GET /auth/signup/nickname/verify", () => {
    it("랜덤 닉네임 사용 가능 여부 (백엔드에 따라 400 검증 응답 가능)", async () => {
      try {
        const res = await publicClient.get(
          `/auth/signup/nickname/verify?nickName=test_${Date.now()}`,
        )
        expect(res.status).toBeGreaterThanOrEqual(200)
        expect(res.status).toBeLessThan(300)
      } catch (e: unknown) {
        const err = e as { response?: { status?: number } }
        expect(err.response?.status).toBeDefined()
        expect(err.response!.status!).toBeGreaterThanOrEqual(400)
      }
    })
  })

  describe("GET /auth/signup/email/verify", () => {
    itIfCreds("이미 사용 중인 이메일 확인", async () => {
      // 존재하는 이메일이므로 isSuccess=false 이거나 HTTP 에러
      let isDuplicate = false
      try {
        const res = await publicClient.get("/auth/signup/email/verify", {
          params: { email: TEST_EMAIL },
        })
        // isSuccess=true 면 사용 가능, false 면 중복
        isDuplicate = !res.data.isSuccess
      } catch {
        isDuplicate = true
      }
      expect(isDuplicate).toBe(true)
    })

    it("사용 가능한 이메일 확인", async () => {
      const unusedEmail = `unused_${Date.now()}@sinsin.test`
      const res = await publicClient.get("/auth/signup/email/verify", {
        params: { email: unusedEmail },
      })
      assertSuccess(res.data)
    })
  })

  // ────────────────────────────────────────────────
  // 회원가입 OTP 전송
  // ────────────────────────────────────────────────
  describe("POST /auth/signup/email/otp/send", () => {
    it("회원가입 OTP 전송 (스팸 정책 등으로 4xx 가능)", async () => {
      const unusedEmail = `test_otp_${Date.now()}@sinsin.test`
      try {
        const res = await publicClient.post("/auth/signup/email/otp/send", {
          email: unusedEmail,
        })
        assertSuccess(res.data)
      } catch (e: unknown) {
        const err = e as { response?: { status?: number } }
        expect(err.response?.status).toBeDefined()
        expect(err.response!.status!).toBeGreaterThanOrEqual(400)
      }
    })
  })

  // ────────────────────────────────────────────────
  // 비밀번호 재설정 OTP 전송
  // ────────────────────────────────────────────────
  describe("POST /auth/password/email/otp/send", () => {
    itIfCreds(
      "비밀번호 재설정 OTP 전송 (스팸 정책 등으로 4xx 가능)",
      async () => {
        try {
          const res = await publicClient.post("/auth/password/email/otp/send", {
            email: TEST_EMAIL,
          })
          assertSuccess(res.data)
        } catch (e: unknown) {
          const err = e as { response?: { status?: number } }
          expect(err.response?.status).toBeDefined()
          expect(err.response!.status!).toBeGreaterThanOrEqual(400)
        }
      },
    )

    it("존재하지 않는 이메일로 OTP 전송 시도 → 4xx", async () => {
      await expect(
        publicClient.post("/auth/password/email/otp/send", {
          email: "notexist_12345@sinsin.test",
        }),
      ).rejects.toMatchObject({
        response: { status: expect.any(Number) },
      })
    })
  })

  // ────────────────────────────────────────────────
  // 비밀번호 재설정 OTP 검증 (잘못된 코드)
  // ────────────────────────────────────────────────
  describe("POST /auth/password/email/otp/verify", () => {
    itIfCreds("잘못된 OTP 코드 → 4xx 또는 isSuccess=false", async () => {
      let failed = false
      try {
        const res = await publicClient.post("/auth/password/email/otp/verify", {
          email: TEST_EMAIL,
          authKey: "000000",
        })
        failed = !res.data.isSuccess
      } catch {
        failed = true
      }
      expect(failed).toBe(true)
    })
  })

  // ────────────────────────────────────────────────
  // 비밀번호 변경 (인증 상태)
  // ────────────────────────────────────────────────
  describe("PATCH /user/password", () => {
    itIfCreds("현재 비밀번호가 틀리면 변경 실패 → 4xx", async () => {
      await loginAsTestUser()
      await expect(
        authClient.patch("/user/password", {
          currentPassword: "WrongPassword!999",
          newPassword: "NewPassword123!",
        }),
      ).rejects.toMatchObject({
        response: { status: expect.any(Number) },
      })
    })
  })

  // ────────────────────────────────────────────────
  // 회원가입 (앱 authService.signup)
  // ────────────────────────────────────────────────
  describe("POST /auth/signup", () => {
    it("잘못된 본문 → 4xx 또는 isSuccess=false", async () => {
      let failed = false
      try {
        const res = await publicClient.post(
          "/auth/signup",
          {} as Record<string, unknown>,
        )
        failed = !res.data?.isSuccess
      } catch {
        failed = true
      }
      expect(failed).toBe(true)
    })
  })

  // ────────────────────────────────────────────────
  // 회원가입 OTP 검증 (앱 emailService.verifyCode)
  // ────────────────────────────────────────────────
  describe("POST /auth/signup/email/otp/verify", () => {
    it("잘못된 OTP → 4xx 또는 isSuccess=false", async () => {
      let failed = false
      try {
        const res = await publicClient.post("/auth/signup/email/otp/verify", {
          email: `unused_${Date.now()}@sinsin.test`,
          authKey: "000000",
        })
        failed = !res.data?.isSuccess
      } catch {
        failed = true
      }
      expect(failed).toBe(true)
    })
  })

  // ────────────────────────────────────────────────
  // 비밀번호 재설정 이메일 전송 (앱 resendVerificationCode)
  // ────────────────────────────────────────────────
  describe("POST /auth/password/email/send", () => {
    itIfCreds(
      "기존 계정 이메일로 전송 요청 (rate limit 시 실패 가능)",
      async () => {
        try {
          const res = await publicClient.post("/auth/password/email/send", {
            email: TEST_EMAIL,
          })
          assertSuccess(res.data)
        } catch (e: unknown) {
          const err = e as { response?: { status?: number } }
          expect(err.response?.status).toBeDefined()
          expect(err.response!.status!).toBeGreaterThanOrEqual(400)
        }
      },
    )
  })

  // ────────────────────────────────────────────────
  // 비밀번호 재설정 (딥링크 토큰, 앱 passwordService)
  // ────────────────────────────────────────────────
  describe("PATCH /auth/password/reset", () => {
    it("유효하지 않은 resetToken → 4xx", async () => {
      await expect(
        publicClient.patch("/auth/password/reset", {
          resetToken: "invalid.token.value",
          password: "NewPassword123!",
        }),
      ).rejects.toMatchObject({
        response: { status: expect.any(Number) },
      })
    })
  })
})

describe("local social reauthentication intent", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAsyncStorage.getItem.mockResolvedValue(null)
    mockAsyncStorage.setItem.mockResolvedValue(undefined)
    mockAsyncStorage.removeItem.mockResolvedValue(undefined)
    mockAppTokenService.setTokens.mockResolvedValue(undefined)
  })

  it("restores the access/refresh session without reading or changing provider UI intent", async () => {
    mockAppTokenService.getPersistedRefreshToken.mockResolvedValue("refresh-token")
    mockAppPublicApi.post.mockResolvedValue({
      data: {
        result: {
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
          accountState: "ACTIVE",
          requiresAdditionalInfo: false,
          user: {
            id: 42,
            email: "restored@example.com",
            nickName: "Restored",
          },
        },
      },
    })

    await expect(authService.restoreSession()).resolves.toMatchObject({
      user: { uid: "42" },
      accountState: "ACTIVE",
    })

    expect(mockAppPublicApi.post).toHaveBeenCalledWith("/auth/tokens/refresh", {
      refreshToken: "refresh-token",
    })
    expect(mockAppTokenService.setTokens).toHaveBeenCalledWith(
      "new-access-token",
      "new-refresh-token",
      "persistent",
    )
    expect(mockAsyncStorage.getItem).not.toHaveBeenCalled()
    expect(mockAsyncStorage.setItem).not.toHaveBeenCalled()
    expect(mockAsyncStorage.removeItem).not.toHaveBeenCalled()
  })

  it("does not persist reauthentication intent for automatic logout", async () => {
    await persistSocialReauthenticationIntentForSignOut("automatic")

    expect(mockAsyncStorage.setItem).not.toHaveBeenCalled()
  })

  it("persists intent only for explicit settings logout", async () => {
    await persistSocialReauthenticationIntentForSignOut("explicit")

    expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(1)
  })

  it("reports and consumes the persisted one-shot intent", async () => {
    mockAsyncStorage.getItem.mockResolvedValue("required")

    await expect(isSocialReauthenticationRequired()).resolves.toBe(true)
    await consumeSocialReauthenticationIntent()

    expect(mockAsyncStorage.removeItem).toHaveBeenCalledTimes(1)
  })
})
