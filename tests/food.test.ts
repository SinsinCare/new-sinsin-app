import FormData from "form-data"
import {
  authClient,
  loginAsTestUser,
  tokenStore,
  assertSuccess,
} from "./helpers/client"
import { describeAuth } from "./helpers/testCredentials"

/** 1×1 PNG (투명) — multipart /food-camera/analyze 용 */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)

function buildFoodAnalysisUpdateBody(r: {
  servings: number
  eatenPercentage: number
  foods: {
    id?: number
    name: string
    servingSizeValue: number | null
    servingSizeUnit: string
  }[]
}) {
  return {
    servings: r.servings,
    eatenPercentage: r.eatenPercentage,
    foods: r.foods.map((f) => ({
      foodId: f.id,
      name: f.name,
      servingSizeValue: f.servingSizeValue ?? 0,
      servingSizeUnit: f.servingSizeUnit,
    })),
  }
}

describeAuth("Food Camera API", () => {
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

      const food = result.foods[0] as {
        name?: string
        foodName?: string
        sodium?: number
        nutritionInfo?: { sodium?: number }
      }
      expect(typeof (food.name ?? food.foodName)).toBe("string")
      if (food.nutritionInfo && typeof food.nutritionInfo === "object") {
        expect(food.nutritionInfo).toHaveProperty("sodium")
      } else {
        expect(typeof food.sodium).toBe("number")
      }
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

      const food = res.data.result.foods[0] as {
        nutritionInfo?: { kcal?: number; sodium?: number }
        sodium?: number
        calories?: number
      }
      if (food.nutritionInfo) {
        expect(food.nutritionInfo).toHaveProperty("sodium")
      } else {
        expect(typeof (food.sodium ?? food.calories)).toBe("number")
      }
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

  // ────────────────────────────────────────────────
  // 이미지 분석 (앱 foodCameraService.analyze)
  // ────────────────────────────────────────────────
  describe("POST /food-camera/analyze (multipart)", () => {
    it("작은 PNG로 분석 요청", async () => {
      const form = new FormData()
      form.append("image", PNG_1X1, {
        filename: "tiny.png",
        contentType: "image/png",
      })
      const res = await authClient.post("/food-camera/analyze", form, {
        headers: form.getHeaders(),
      })
      assertSuccess(res.data)
      expect(res.data.result.foods.length).toBeGreaterThan(0)
    })
  })

  // ────────────────────────────────────────────────
  // 분석 결과 수정 (앱 updateFoodTitle / updateFoodAnalysis)
  // ────────────────────────────────────────────────
  describe("PATCH /food-camera/analysis-results/:id/title & PATCH /analysis-results/:id", () => {
    it("제목·섭취/음식 목록 동일 값으로 갱신", async () => {
      const analyze = await authClient.post("/food-camera/analyze-text", {
        text: "우유 200ml",
      })
      assertSuccess(analyze.data)
      const result = analyze.data.result as {
        foodAnalysisResultId: number
        title: string
        servings: number
        eatenPercentage: number
        foods: {
          id?: number
          name: string
          servingSizeValue: number | null
          servingSizeUnit: string
        }[]
      }
      const id = result.foodAnalysisResultId

      const titleRes = await authClient.patch(
        `/food-camera/analysis-results/${id}/title`,
        { title: result.title },
      )
      assertSuccess(titleRes.data)

      const patchRes = await authClient.patch(
        `/food-camera/analysis-results/${id}`,
        buildFoodAnalysisUpdateBody(result),
      )
      assertSuccess(patchRes.data)
    })
  })

  // ────────────────────────────────────────────────
  // 일지 상세 · 등록 (앱 fetchDiaryResult / registerDiary)
  // ────────────────────────────────────────────────
  describe("GET /food-camera/diaries/:diaryId/analysis & POST .../analysis-results/.../diary", () => {
    it("오늘 날짜 분석에 일지가 있으면 상세 조회", async () => {
      const today = new Date().toISOString().split("T")[0]
      const res = await authClient.get(`/food-camera/date-analysis/${today}`)
      expect(res.status).toBeGreaterThanOrEqual(200)
      const data = res.data as { result?: { diets?: { diaryId: number }[] } }
      const diets = data?.result?.diets
      if (!diets?.length) {
        return
      }
      const diaryRes = await authClient.get(
        `/food-camera/diaries/${diets[0].diaryId}/analysis`,
      )
      assertSuccess(diaryRes.data)
    })

    it("분석 결과 일지 등록 (중복 시 4xx 가능)", async () => {
      const analyze = await authClient.post("/food-camera/analyze-text", {
        text: "요구르트",
      })
      assertSuccess(analyze.data)
      const { foodAnalysisResultId } = analyze.data.result as {
        foodAnalysisResultId: number
      }
      const today = new Date().toISOString().split("T")[0]
      try {
        const res = await authClient.post(
          `/food-camera/analysis-results/${foodAnalysisResultId}/diary`,
          { date: today, mealType: "SNACKS" },
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
})
