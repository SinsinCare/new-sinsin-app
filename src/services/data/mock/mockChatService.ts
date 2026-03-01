import type {
  ChatService,
  Chat,
  Message,
  ChatCategory,
} from "../../../types/chat"
import { MOCK_CHATS, MOCK_CHAT_MESSAGES } from "./mockData"

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

function pickMockCategory(): ChatCategory {
  const categories: ChatCategory[] = [
    "FOOD_DIET",
    "MEDICATION",
    "LIFESTYLE",
    "SYMPTOMS",
    "EXAM",
    "NONE",
  ]
  return categories[Math.floor(Math.random() * categories.length)]
}

const CATEGORY_LABELS: Record<ChatCategory, string> = {
  FOOD_DIET: "음식·식단",
  MEDICATION: "약·영양제",
  LIFESTYLE: "생활관리",
  SYMPTOMS: "증상",
  EXAM: "검사·수치해석",
  NONE: "기타",
}

export function createMockChatService(): ChatService {
  let nextConvId = MOCK_CHATS.length + 1
  let nextMsgId =
    Math.max(
      ...[...MOCK_CHAT_MESSAGES.values()].flatMap((msgs) =>
        msgs.map((m) => m.id),
      ),
    ) + 1
  const conversations: Chat[] = [...MOCK_CHATS]
  const messagesStore: Map<number, Message[]> = new Map(
    [...MOCK_CHAT_MESSAGES.entries()].map(([k, v]) => [k, [...v]]),
  )

  return {
    async getChats() {
      await delay()
      return {
        conversations: conversations,
        totalCount: conversations.length,
      }
    },

    async createChat(category: ChatCategory) {
      await delay()
      const convId = nextConvId++
      const now = new Date()
      const conversation: Chat = {
        id: convId,
        title: "새 상담",
        status: "ACTIVE",
        category: category,
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

      return { conversation }
    },

    async getChatDetail(conversationId: number) {
      await delay()
      const conv = conversations.find((c) => c.id === conversationId)
      if (!conv) throw new Error(`Conversation ${conversationId} not found`)
      const msgs = messagesStore.get(conversationId) ?? []
      return {
        conversation: { ...conv },
        messages: [...msgs],
      }
    },

    async deleteChat(conversationId: number) {
      await delay()
      const idx = conversations.findIndex((c) => c.id === conversationId)
      if (idx !== -1) conversations.splice(idx, 1)
      messagesStore.delete(conversationId)
    },

    async renameChat(conversationId: number, title: string) {
      await delay()
      const conv = conversations.find((c) => c.id === conversationId)
      if (conv) conv.title = title
    },

    async getMessages(conversationId: number) {
      await delay()
      return [...(messagesStore.get(conversationId) ?? [])]
    },

    async sendMessage(
      conversationId: number,
      content: string,
      userCategory: ChatCategory,
      onChunk?: (text: string) => void,
    ) {
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
