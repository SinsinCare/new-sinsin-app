import type {
  ChatService,
  Chat,
  Message,
  ChatCategory,
} from "../../../types/chat"
import { MOCK_CHATS, MOCK_CHAT_MESSAGES } from "./mockData"
import { getAppLanguage, type Language } from "@/src/i18n"

const delay = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms))

// 카테고리별 목 응답
const MOCK_REPLIES: Record<Language, string[]> = {
  ko: [
    "신장 건강에서 어떤 점이 궁금한지 편하게 말씀해 주세요.",
    "신장 건강은 식사와 정기 검진을 함께 살펴보는 게 중요해요. 어떤 부분이 가장 궁금하세요?",
    "말씀해 주신 내용을 하나씩 살펴볼게요. 진단이나 처방이 필요하면 담당 의료진과 상의해 주세요.",
  ],
  en: [
    "Tell me what’s on your mind about kidney health, and we’ll look at it together.",
    "Kidney care often means looking at meals and routine checkups together. What would you like to start with?",
    "Let’s take it one piece at a time. For a diagnosis or treatment decision, check with your care team.",
  ],
}

/**
 * 검사 수치 질문을 알아보는 패턴. "LDL 콜레스테롤 수치가 151mg/dL인데…" 에서
 * 항목명과 값을 뽑는다. 단위는 검진 카탈로그에 실제로 나오는 것들만 본다.
 */
const LAB_QUESTION =
  /([가-힣A-Za-z][가-힣A-Za-z0-9 ()]*?)\s*(?:수치)?[가-힣]*\s*([0-9]+(?:\.[0-9]+)?)\s*(mg\/dL|mg\/dl|mmHg|mL\/min|g\/dL|U\/L|%)/u

/**
 * 목 응답.
 *
 * **사용자가 무엇을 물었는지 본다.** 예전에는 메시지를 무시하고 3개 문구 중 랜덤으로 골라서,
 * 검진 상세의 "질문하기" 로 수치를 물어도 "어떤 부분이 가장 궁금하세요?" 가 돌아왔다.
 * 주입은 제대로 됐는데 화면만 보면 기능이 고장 난 것처럼 보인다 — 실제로 그렇게 신고됐다.
 * 목이 입력을 무시하면 없는 버그를 만들고 있는 버그는 가린다.
 *
 * 여기서 임상적으로 옳은 답을 지어내지는 않는다. 질문을 되짚고, 판단은 실제 모델·의료진의
 * 몫이라고 말한다 — 목이 그럴듯한 의학 문장을 만들면 그게 더 위험하다.
 */
function pickMockReply(language: Language, message: string): string {
  const lab = LAB_QUESTION.exec(message)
  if (lab) {
    const [, rawName, value, unit] = lab
    const name = rawName.trim()
    return language === "en"
      ? `Your ${name} is ${value} ${unit}. In the real app the assistant compares this with your reference range and explains what it means. (Mock reply — no clinical judgement here.)`
      : `${name} ${value} ${unit} 에 대해 물으셨어요. 실제 앱에서는 참고범위와 비교해 어떤 의미인지 설명해 드려요. (목 응답이라 임상 판단은 하지 않아요.)`
  }

  const pool = MOCK_REPLIES[language]
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * 응답에 붙는 분류.
 *
 * **사용자가 고른 분류를 존중한다.** 예전에는 6개 중 랜덤이라, 검진 상세에서 "EXAM" 으로
 * 보낸 질문에 "음식·식단" 딱지가 붙는 일이 흔했다. 분류를 화면이 그대로 보여 주므로
 * 랜덤 딱지는 곧 화면의 오답이다.
 *
 * `NONE`(분류 없음)일 때만 아무거나 고른다 — 실제 서버도 그때 스스로 분류한다.
 */
function pickMockCategory(userCategory: ChatCategory): ChatCategory {
  if (userCategory !== "NONE") return userCategory
  const categories: ChatCategory[] = [
    "FOOD_DIET",
    "MEDICATION",
    "LIFESTYLE",
    "SYMPTOMS",
    "EXAM",
  ]
  return categories[Math.floor(Math.random() * categories.length)]
}

const CATEGORY_LABELS: Record<Language, Record<ChatCategory, string>> = {
  ko: {
    FOOD_DIET: "음식·식단",
    MEDICATION: "약·영양제",
    LIFESTYLE: "생활관리",
    SYMPTOMS: "증상",
    EXAM: "검사·수치해석",
    NONE: "기타",
  },
  en: {
    FOOD_DIET: "Food and meals",
    MEDICATION: "Medications",
    LIFESTYLE: "Daily habits",
    SYMPTOMS: "Symptoms",
    EXAM: "Lab results",
    NONE: "Something else",
  },
}

const EN_SEED_CHATS: Record<number, Pick<Chat, "title" | "summary">> = {
  1: {
    title: "Ways to cut back on sodium",
    summary:
      "Practical ways to lower sodium while following the goals set by your care team.",
  },
  2: {
    title: "Fruit choices when potassium is high",
    summary:
      "Potassium varies by fruit, so use your latest labs and personal meal plan to choose the type and amount.",
  },
  3: {
    title: "Understanding your eGFR",
    summary:
      "eGFR is best understood as a trend alongside your other test results, not as a single isolated number.",
  },
}

const EN_SEED_MESSAGES: Record<
  number,
  Pick<Message, "content" | "aiCategoryLabel">
> = {
  1: {
    content:
      "I have stage 3 chronic kidney disease. How can I lower my sodium intake?",
  },
  2: {
    content:
      "Your sodium goal depends on your labs and overall health. If your care team gave you a target, follow that first. For everyday meals, try lemon, vinegar, pepper, or other salt-free seasonings for flavor.",
    aiCategoryLabel: "Food and meals",
  },
  3: {
    content: "Which fruits should I avoid if my potassium is high?",
  },
  4: {
    content:
      "Potassium varies by fruit. Use your latest potassium result and personal meal plan, then ask your clinician or dietitian which fruits and daily portions fit your care.",
    aiCategoryLabel: "Food and meals",
  },
  5: {
    content: "How should I understand my eGFR?",
  },
  6: {
    content:
      "eGFR is one measure of how well your kidneys filter. A single result doesn’t tell the whole story, so your care team will look at the trend and your other test results too.",
    aiCategoryLabel: "Lab results",
  },
}

function presentChat(chat: Chat): Chat {
  if (getAppLanguage() !== "en") return { ...chat }
  const localized = EN_SEED_CHATS[chat.id]
  return localized ? { ...chat, ...localized } : { ...chat }
}

function presentMessage(message: Message): Message {
  if (getAppLanguage() !== "en") return { ...message }
  const localized = EN_SEED_MESSAGES[message.id]
  return localized ? { ...message, ...localized } : { ...message }
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
        conversations: conversations.map(presentChat),
        totalCount: conversations.length,
      }
    },

    async createChat(category: ChatCategory) {
      await delay()
      const convId = nextConvId++
      const now = new Date()
      const conversation: Chat = {
        id: convId,
        title: getAppLanguage() === "en" ? "New chat" : "새 상담",
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
          getAppLanguage() === "en"
            ? "Hi! I’m Sinsin. Ask me anything that’s on your mind about kidney health."
            : "안녕하세요. 신장 건강에 관해 궁금한 점을 편하게 물어보세요.",
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
        conversation: presentChat(conv),
        messages: msgs.map(presentMessage),
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
      return (messagesStore.get(conversationId) ?? []).map(presentMessage)
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
      const aiCategory = pickMockCategory(userCategory)
      const language = getAppLanguage()
      const assistantMsg: Message = {
        id: nextMsgId++,
        conversationId,
        role: "assistant",
        content: pickMockReply(language, content),
        aiCategory,
        aiCategoryLabel: CATEGORY_LABELS[language][aiCategory],
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
      const summary =
        getAppLanguage() === "en"
          ? "Chronic kidney disease meal planning"
          : "만성신장질환 식이 관리 상담"
      const conv = conversations.find((c) => c.id === conversationId)
      if (conv) conv.summary = summary
      return { conversationId, summary }
    },
  }
}
