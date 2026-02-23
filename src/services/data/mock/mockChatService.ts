import type {
  IChatApiService,
  Conversation,
  Message,
  AiMessageCategory,
} from "../../../types/chat"

const delay = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms))

// 카테고리별 목 응답
const MOCK_REPLIES: Record<string, string[]> = {
  default: [
    "안녕하세요! 만성신장질환 관리에 대해 도움을 드리겠습니다. 어떤 것이 궁금하신가요?",
    "좋은 질문이시네요. CKD 환자분의 건강 관리에서 가장 중요한 것은 식이 조절과 정기적인 검진입니다.",
    "해당 내용에 대해 자세히 안내해드리겠습니다. 다만, 정확한 진단과 처방은 반드시 주치의와 상담해주세요.",
  ],
}

function pickMockReply(): string {
  const pool = MOCK_REPLIES.default
  return pool[Math.floor(Math.random() * pool.length)]
}

function pickMockCategory(): AiMessageCategory {
  const categories: AiMessageCategory[] = [
    "DIET_POTASSIUM",
    "DIET_SODIUM",
    "GENERAL",
    "LIFESTYLE",
  ]
  return categories[Math.floor(Math.random() * categories.length)]
}

const CATEGORY_LABELS: Record<AiMessageCategory, string> = {
  DIET_POTASSIUM: "식이-칼륨",
  DIET_SODIUM: "식이-나트륨",
  DIET_PROTEIN: "식이-단백질",
  MEDICATION: "약물",
  SYMPTOMS: "증상",
  LIFESTYLE: "생활습관",
  DIALYSIS: "투석",
  GENERAL: "일반",
  OTHER: "기타",
}

export function createMockChatService(): IChatApiService {
  let nextConvId = 1
  let nextMsgId = 1
  const conversations: Conversation[] = []
  const messagesStore: Map<number, Message[]> = new Map()

  return {
    async getConversations() {
      await delay()
      return {
        conversations: [...conversations].sort(
          (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
        ),
        totalCount: conversations.length,
      }
    },

    async createConversation() {
      await delay()
      const convId = nextConvId++
      const now = new Date()
      const conversation: Conversation = {
        id: convId,
        title: "새 상담",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      }
      conversations.push(conversation)

      const greetingMessage: Message = {
        id: nextMsgId++,
        conversationId: convId,
        role: "assistant",
        content:
          "안녕하세요! 신신당부 AI 상담사입니다. 만성신장질환 관리에 대해 무엇이든 편하게 물어보세요.",
        createdAt: now,
      }
      messagesStore.set(convId, [greetingMessage])

      return { conversation, greetingMessage }
    },

    async getConversationDetail(conversationId: number) {
      await delay()
      const conv = conversations.find((c) => c.id === conversationId)
      if (!conv) throw new Error(`Conversation ${conversationId} not found`)
      const msgs = messagesStore.get(conversationId) ?? []
      return {
        conversation: { ...conv },
        messages: [...msgs],
      }
    },

    async deleteConversation(conversationId: number) {
      await delay()
      const idx = conversations.findIndex((c) => c.id === conversationId)
      if (idx !== -1) conversations.splice(idx, 1)
      messagesStore.delete(conversationId)
    },

    async getMessages(conversationId: number) {
      await delay()
      return [...(messagesStore.get(conversationId) ?? [])]
    },

    async sendMessage(conversationId: number, content: string) {
      await delay()
      const now = new Date()
      const msgs = messagesStore.get(conversationId) ?? []

      // Add user message
      const userMsg: Message = {
        id: nextMsgId++,
        conversationId,
        role: "user",
        content,
        createdAt: now,
      }
      msgs.push(userMsg)

      // Simulate AI response delay
      await delay(800 + Math.random() * 700)
      const aiCategory = pickMockCategory()
      const assistantMsg: Message = {
        id: nextMsgId++,
        conversationId,
        role: "assistant",
        content: pickMockReply(),
        aiCategory,
        aiCategoryLabel: CATEGORY_LABELS[aiCategory],
        createdAt: new Date(),
      }
      msgs.push(assistantMsg)
      messagesStore.set(conversationId, msgs)

      // Update conversation
      const conv = conversations.find((c) => c.id === conversationId)
      if (conv) {
        conv.updatedAt = new Date()
        conv.messageCount = msgs.length
      }

      return assistantMsg
    },

    async generateSummary(conversationId: number) {
      await delay(300)
      const summary = "만성신장질환 식이 관리에 대한 상담 내용입니다."
      const conv = conversations.find((c) => c.id === conversationId)
      if (conv) conv.summary = summary
      return { conversationId, summary }
    },
  }
}
