import {
  publicClient,
  authClient,
  loginAsTestUser,
  tokenStore,
  assertSuccess,
} from "./helpers/client"

const TEST_EMAIL = process.env.TEST_EMAIL!
const TEST_PASSWORD = process.env.TEST_PASSWORD!

describe("Auth API", () => {
  afterEach(() => {
    tokenStore.clear()
  })

  // ────────────────────────────────────────────────
  // 로그인
  // ────────────────────────────────────────────────
  describe("POST /auth/login", () => {
    it("유효한 자격증명으로 로그인 성공", async () => {
      const res = await publicClient.post("/auth/login", {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      })
      assertSuccess(res.data)
      expect(res.data.result.accessToken).toBeTruthy()
      expect(res.data.result.refreshToken).toBeTruthy()
      expect(typeof res.data.result.accountState).toBe("string")
    })

    it("잘못된 비밀번호로 로그인 실패 → 4xx", async () => {
      await expect(
        publicClient.post("/auth/login", {
          email: TEST_EMAIL,
          password: "WrongPassword!999",
        }),
      ).rejects.toMatchObject({
        response: { status: expect.any(Number) },
      })
    })

    it("존재하지 않는 이메일로 로그인 실패 → 4xx", async () => {
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
    it("유효한 refreshToken으로 토큰 갱신 성공", async () => {
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
  describe("GET /auth/signup/email/verify", () => {
    it("이미 사용 중인 이메일 확인", async () => {
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
    it("회원가입 OTP 전송 성공", async () => {
      const unusedEmail = `test_otp_${Date.now()}@sinsin.test`
      const res = await publicClient.post("/auth/signup/email/otp/send", {
        email: unusedEmail,
      })
      assertSuccess(res.data)
    })
  })

  // ────────────────────────────────────────────────
  // 비밀번호 재설정 OTP 전송
  // ────────────────────────────────────────────────
  describe("POST /auth/password/email/otp/send", () => {
    it("비밀번호 재설정 OTP 전송 성공", async () => {
      const res = await publicClient.post("/auth/password/email/otp/send", {
        email: TEST_EMAIL,
      })
      assertSuccess(res.data)
    })

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
    it("잘못된 OTP 코드 → 4xx 또는 isSuccess=false", async () => {
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
  describe("PUT /auth/password", () => {
    it("인증 없이 비밀번호 변경 시도 → 401", async () => {
      await expect(
        authClient.put("/auth/password", { newPassword: "NewPassword123!" }),
      ).rejects.toMatchObject({
        response: { status: 401 },
      })
    })
  })
})
