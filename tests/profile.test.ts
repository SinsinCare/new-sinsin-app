import {
  authClient,
  loginAsTestUser,
  tokenStore,
  assertSuccess,
} from "./helpers/client"
import { describeAuth } from "./helpers/testCredentials"

describeAuth("Profile & user API", () => {
  beforeAll(async () => {
    await loginAsTestUser()
  })

  afterAll(() => {
    tokenStore.clear()
  })

  // ────────────────────────────────────────────────
  // 마이페이지 프로필 (앱 useMyPageProfile)
  // ────────────────────────────────────────────────
  describe("GET /user/profile", () => {
    it("프로필 조회 성공", async () => {
      const res = await authClient.get("/user/profile")
      assertSuccess(res.data)
      expect(res.data.result).toBeTruthy()
    })
  })

  describe("PATCH /user/profile", () => {
    it("동일 값으로 저장 (앱 ProfileEditScreen)", async () => {
      const get = await authClient.get("/user/profile")
      assertSuccess(get.data)
      const r = get.data.result as {
        nickName?: string
        name?: string
        gender?: string
      }
      const res = await authClient.patch("/user/profile", {
        nickName: r.nickName,
        name: r.name,
        ...(r.gender ? { gender: r.gender } : {}),
      })
      assertSuccess(res.data)
    })
  })

  describe("POST /user/profile/info", () => {
    it("닉네임·성별 동일 값 (앱 NicknameEditScreen)", async () => {
      const get = await authClient.get("/user/profile")
      assertSuccess(get.data)
      const r = get.data.result as {
        nickName?: string
        gender?: string
      }
      const res = await authClient.post("/user/profile/info", {
        nickName: r.nickName ?? "",
        gender: r.gender ?? "",
      })
      assertSuccess(res.data)
    })
  })

  describe("POST /user/link-doctor", () => {
    it("잘못된 초대 코드 → 4xx 또는 isSuccess=false", async () => {
      let failed = false
      try {
        const res = await authClient.post("/user/link-doctor", {
          inviteCode: "INVALID_CODE",
        })
        failed = !res.data?.isSuccess
      } catch {
        failed = true
      }
      expect(failed).toBe(true)
    })
  })

  describe("POST /user/inquiries", () => {
    it("1:1 문의 등록 (앱 InquiryScreen)", async () => {
      const res = await authClient.post("/user/inquiries", {
        subject: "[API 테스트] 자동 점검",
        content: "tests/profile.test.ts 에서 호출한 테스트 문의입니다.",
      })
      assertSuccess(res.data)
    })
  })

  // ────────────────────────────────────────────────
  // 온보딩 (앱 onboardingService.getSteps)
  // ────────────────────────────────────────────────
  describe("POST /user/onboarding", () => {
    it("잘못된 본문 → 4xx 또는 isSuccess=false (앱 submitAnswers)", async () => {
      let failed = false
      try {
        const res = await authClient.post("/user/onboarding", {})
        failed = !res.data?.isSuccess
      } catch {
        failed = true
      }
      expect(failed).toBe(true)
    })
  })

  describe("GET /user/onboarding/ckd | /non-ckd", () => {
    it("둘 중 하나는 isSuccess 및 배열 result", async () => {
      const results = await Promise.allSettled([
        authClient.get("/user/onboarding/ckd"),
        authClient.get("/user/onboarding/non-ckd"),
      ])
      const ok = results.some((r) => {
        if (r.status !== "fulfilled") return false
        const d = r.value.data as { isSuccess?: boolean; result?: unknown }
        return Boolean(d?.isSuccess && Array.isArray(d.result))
      })
      expect(ok).toBe(true)
    })
  })

  // ────────────────────────────────────────────────
  // 건강검진 NHIS (앱 nhisService)
  // ────────────────────────────────────────────────
  describe("GET /health-check/auth-methods", () => {
    it("인증 수단 목록", async () => {
      const res = await authClient.get("/health-check/auth-methods")
      expect(res.status).toBeGreaterThanOrEqual(200)
      expect(res.status).toBeLessThan(300)
    })
  })

  describe("GET /health-check/results", () => {
    it("검진 결과 목록", async () => {
      const res = await authClient.get("/health-check/results")
      expect(res.status).toBeGreaterThanOrEqual(200)
      expect(res.status).toBeLessThan(300)
    })

    it("GET /health-check/results/:resultId (목록에 항목이 있을 때만)", async () => {
      const list = await authClient.get("/health-check/results")
      const data = list.data as { result?: { resultId: number }[] }
      const items = Array.isArray(data?.result) ? data.result : []
      if (items.length === 0) {
        return
      }
      const res = await authClient.get(
        `/health-check/results/${items[0].resultId}`,
      )
      expect(res.status).toBeGreaterThanOrEqual(200)
      expect(res.status).toBeLessThan(300)
    })
  })

  describe("POST /health-check/request & confirm (앱 nhisService)", () => {
    it("빈 본문으로 조회 요청 → 4xx", async () => {
      await expect(
        authClient.post("/health-check/request", {}),
      ).rejects.toMatchObject({
        response: { status: expect.any(Number) },
      })
    })

    it("잘못된 requestId로 confirm → 4xx", async () => {
      await expect(
        authClient.post("/health-check/confirm/invalid-request-id"),
      ).rejects.toMatchObject({
        response: { status: expect.any(Number) },
      })
    })
  })

  // ────────────────────────────────────────────────
  // 신장 프로필
  // ────────────────────────────────────────────────
  describe("GET /user/profile/kidney", () => {
    it("신장 프로필 조회 성공", async () => {
      const res = await authClient.get("/user/profile/kidney")
      assertSuccess(res.data)

      const profile = res.data.result
      expect(typeof profile.ckdStage).toBe("string")
      expect(typeof profile.isDialysis).toBe("boolean")
      // weightKg 는 null 허용
      expect(
        profile.weightKg === null || typeof profile.weightKg === "number",
      ).toBe(true)
    })
  })

  // ────────────────────────────────────────────────
  // 체중 기록
  // ────────────────────────────────────────────────
  describe("POST /weight-records", () => {
    it("체중 기록 성공", async () => {
      const today = new Date().toISOString().split("T")[0]
      const res = await authClient.post("/weight-records", {
        weightKg: 68.5,
        date: today,
      })
      // 응답 구조 확인 (백엔드에 따라 isSuccess 필드 있을 수도)
      expect(res.status).toBeGreaterThanOrEqual(200)
      expect(res.status).toBeLessThan(300)
    })

    it("잘못된 체중값 → 4xx", async () => {
      await expect(
        authClient.post("/weight-records", {
          weightKg: -10,
          date: "2026-01-01",
        }),
      ).rejects.toMatchObject({
        response: { status: expect.any(Number) },
      })
    })
  })

  // ────────────────────────────────────────────────
  // 부종 기록
  // ────────────────────────────────────────────────
  describe("POST /edema-records", () => {
    it("부종 기록 성공 (NONE)", async () => {
      const today = new Date().toISOString().split("T")[0]
      const res = await authClient.post("/edema-records", {
        edemaLevel: "NONE",
        date: today,
      })
      expect(res.status).toBeGreaterThanOrEqual(200)
      expect(res.status).toBeLessThan(300)
    })
  })

  // ────────────────────────────────────────────────
  // 인증 없이 접근 차단 확인
  // ────────────────────────────────────────────────
  describe("인증 필요 엔드포인트 보호", () => {
    it("토큰 없이 신장 프로필 조회 → 401", async () => {
      const { default: axios } = await import("axios")
      const { BASE_URL } = await import("./helpers/client")

      await expect(
        axios.get(`${BASE_URL}/user/profile/kidney`),
      ).rejects.toMatchObject({
        response: { status: 401 },
      })
    })
  })
})
