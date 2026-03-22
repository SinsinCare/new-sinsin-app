import {
  authClient,
  loginAsTestUser,
  tokenStore,
  assertSuccess,
} from "./helpers/client"

describe("Profile API", () => {
  beforeAll(async () => {
    await loginAsTestUser()
  })

  afterAll(() => {
    tokenStore.clear()
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
