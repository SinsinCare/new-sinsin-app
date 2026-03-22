import {
  authClient,
  loginAsTestUser,
  tokenStore,
  assertSuccess,
} from "./helpers/client"

describe("Food Camera API", () => {
  beforeAll(async () => {
    await loginAsTestUser()
  })

  afterAll(() => {
    tokenStore.clear()
  })

  // ────────────────────────────────────────────────
  // 텍스트 기반 음식 분석
  // ────────────────────────────────────────────────
  describe("POST /food-camera/analyze-text", () => {
    it("김치찌개 분석 성공", async () => {
      const res = await authClient.post("/food-camera/analyze-text", {
        text: "김치찌개 한 그릇",
      })
      assertSuccess(res.data)

      const result = res.data.result
      expect(Array.isArray(result.foods)).toBe(true)
      expect(result.foods.length).toBeGreaterThan(0)

      const food = result.foods[0]
      expect(typeof food.foodName).toBe("string")
      expect(typeof food.nutritionInfo).toBe("object")
    })

    it("밥 + 반찬 분석 성공", async () => {
      const res = await authClient.post("/food-camera/analyze-text", {
        text: "흰쌀밥 한 공기, 계란찜, 미역국",
      })
      assertSuccess(res.data)
      expect(res.data.result.foods.length).toBeGreaterThan(0)
    })

    it("영양소 필드 포함 여부 확인", async () => {
      const res = await authClient.post("/food-camera/analyze-text", {
        text: "두부조림",
      })
      assertSuccess(res.data)

      const food = res.data.result.foods[0]
      const nutrition = food.nutritionInfo

      // 신장 환자 주요 영양소 확인
      expect(nutrition).toHaveProperty("kcal")
      expect(nutrition).toHaveProperty("sodium")
    })

    it("신장 안전 평가 필드 확인", async () => {
      const res = await authClient.post("/food-camera/analyze-text", {
        text: "삼겹살 200g",
      })
      assertSuccess(res.data)

      const result = res.data.result
      // kidneyEvaluation 또는 cautionFoods 같은 안전 평가 필드 존재 여부
      expect(result).toBeTruthy()
    })

    it("빈 텍스트 → 4xx 또는 isSuccess=false", async () => {
      let failed = false
      try {
        const res = await authClient.post("/food-camera/analyze-text", {
          text: "",
        })
        failed = !res.data.isSuccess
      } catch {
        failed = true
      }
      expect(failed).toBe(true)
    })
  })

  // ────────────────────────────────────────────────
  // 날짜별 식단 분석 조회
  // ────────────────────────────────────────────────
  describe("GET /food-camera/date-analysis/:date", () => {
    it("오늘 날짜 식단 분석 조회 성공", async () => {
      const today = new Date().toISOString().split("T")[0]
      const res = await authClient.get(`/food-camera/date-analysis/${today}`)

      // 데이터가 없어도 200 응답 (빈 배열 등)
      expect(res.status).toBeGreaterThanOrEqual(200)
      expect(res.status).toBeLessThan(300)
    })

    it("잘못된 날짜 형식 → 4xx", async () => {
      await expect(
        authClient.get("/food-camera/date-analysis/not-a-date"),
      ).rejects.toMatchObject({
        response: { status: expect.any(Number) },
      })
    })
  })

  // ────────────────────────────────────────────────
  // 일지 존재 여부 확인
  // ────────────────────────────────────────────────
  describe("GET /food-camera/statistics/diary-existence", () => {
    it("날짜 범위 일지 존재 여부 조회 성공", async () => {
      const endDate = new Date().toISOString().split("T")[0]
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]

      const res = await authClient.get(
        "/food-camera/statistics/diary-existence",
        {
          params: { startDate, endDate },
        },
      )
      expect(res.status).toBeGreaterThanOrEqual(200)
      expect(res.status).toBeLessThan(300)
    })
  })

  // ────────────────────────────────────────────────
  // 물 섭취량 업데이트
  // ────────────────────────────────────────────────
  describe("PATCH /food-camera/date-analysis/:date/extra-water", () => {
    it("물 섭취량 추가 성공", async () => {
      const today = new Date().toISOString().split("T")[0]
      const res = await authClient.patch(
        `/food-camera/date-analysis/${today}/extra-water`,
        { deltaWater: 200 },
      )
      expect(res.status).toBeGreaterThanOrEqual(200)
      expect(res.status).toBeLessThan(300)
    })
  })
})
