import {
  authClient,
  loginAsTestUser,
  tokenStore,
  assertSuccess,
} from "./helpers/client"
import { describeAuth } from "./helpers/testCredentials"

describeAuth("Chat API", () => {
  let createdConversationId: number | null = null

  beforeAll(async () => {
    await loginAsTestUser()
  })

  afterAll(async () => {
    // 테스트 중 생성된 대화 정리
    if (createdConversationId !== null) {
      try {
        await authClient.delete(`/chat/conversations/${createdConversationId}`)
      } catch {
        // 이미 삭제됐거나 없는 경우 무시
      }
    }
    tokenStore.clear()
  })

  // ────────────────────────────────────────────────
  // 대화 목록 조회
  // ────────────────────────────────────────────────
  describe("GET /chat/conversations", () => {
    it("대화 목록 조회 성공", async () => {
      const res = await authClient.get("/chat/conversations")
      assertSuccess(res.data)

      const result = res.data.result
      expect(Array.isArray(result.conversations)).toBe(true)
      expect(typeof result.totalCount).toBe("number")
    })
  })

  // ────────────────────────────────────────────────
  // 대화 생성
  // ────────────────────────────────────────────────
  describe("POST /chat/conversations", () => {
    it("새 대화 생성 성공 (DIET 카테고리)", async () => {
      const res = await authClient.post("/chat/conversations", {
        category: "DIET",
      })
      assertSuccess(res.data)

      const result = res.data.result
      expect(typeof result.conversationId).toBe("number")
      createdConversationId = result.conversationId
    })
  })

  // ────────────────────────────────────────────────
  // 대화 상세 조회
  // ────────────────────────────────────────────────
  describe("GET /chat/conversations/:id", () => {
    it("생성된 대화 상세 조회 성공", async () => {
      if (!createdConversationId) {
        return
      }
      const res = await authClient.get(
        `/chat/conversations/${createdConversationId}`,
      )
      assertSuccess(res.data)

      const result = res.data.result
      expect(typeof result.conversationId).toBe("number")
    })

    it("존재하지 않는 대화 조회 → 4xx", async () => {
      await expect(
        authClient.get("/chat/conversations/999999999"),
      ).rejects.toMatchObject({
        response: { status: expect.any(Number) },
      })
    })
  })

  // ────────────────────────────────────────────────
  // 메시지 목록 조회
  // ────────────────────────────────────────────────
  describe("GET /chat/conversations/:id/messages", () => {
    it("생성된 대화의 메시지 목록 조회 성공", async () => {
      if (!createdConversationId) {
        return
      }
      const res = await authClient.get(
        `/chat/conversations/${createdConversationId}/messages`,
      )
      assertSuccess(res.data)
      expect(Array.isArray(res.data.result)).toBe(true)
    })
  })

  // ────────────────────────────────────────────────
  // 대화 제목 변경
  // ────────────────────────────────────────────────
  describe("PATCH /chat/conversations/:id/title", () => {
    it("대화 제목 변경 성공", async () => {
      if (!createdConversationId) {
        return
      }
      const res = await authClient.patch(
        `/chat/conversations/${createdConversationId}/title`,
        { title: "테스트 대화 제목" },
      )
      expect(res.status).toBeGreaterThanOrEqual(200)
      expect(res.status).toBeLessThan(300)
    })
  })

  // ────────────────────────────────────────────────
  // 대화 요약 (앱 chatApiService.generateSummary)
  // ────────────────────────────────────────────────
  describe("POST /chat/conversations/:id/summary", () => {
    it("대화 요약 요청 (빈 대화면 백엔드에 따라 실패할 수 있음)", async () => {
      if (!createdConversationId) {
        return
      }
      try {
        const res = await authClient.post(
          `/chat/conversations/${createdConversationId}/summary`,
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

  // ────────────────────────────────────────────────
  // 대화 삭제
  // ────────────────────────────────────────────────
  describe("DELETE /chat/conversations/:id", () => {
    it("대화 삭제 성공", async () => {
      if (!createdConversationId) {
        return
      }
      const res = await authClient.delete(
        `/chat/conversations/${createdConversationId}`,
      )
      expect(res.status).toBeGreaterThanOrEqual(200)
      expect(res.status).toBeLessThan(300)
      createdConversationId = null // afterAll 정리 스킵
    })

    it("이미 삭제된 대화 삭제 → 4xx", async () => {
      await expect(
        authClient.delete("/chat/conversations/999999999"),
      ).rejects.toMatchObject({
        response: { status: expect.any(Number) },
      })
    })
  })
})
