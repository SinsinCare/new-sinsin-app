import type {
  ChatConversation,
  ChatMessage,
  ChatCategory,
} from "@/src/types/models"
import { CATEGORY_LIST } from "../data/mockData"

let nextConvId = 1
let nextMsgId = 1

function makeConvId(): string {
  return `conv_${nextConvId++}`
}

function makeMsgId(): string {
  return `msg_${nextMsgId++}`
}

class ChatService {
  private conversations: ChatConversation[] = []
  private messages: ChatMessage[] = []

  createConversation(userId: string, category: ChatCategory): ChatConversation {
    const meta = CATEGORY_LIST.find((c) => c.key === category)
    const conv: ChatConversation = {
      id: makeConvId(),
      userId,
      title: meta?.label ?? category,
      category,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.conversations.push(conv)
    return conv
  }

  getConversation(id: string): ChatConversation | undefined {
    return this.conversations.find((c) => c.id === id)
  }

  getMessages(conversationId: string): ChatMessage[] {
    return this.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  addMessage(
    conversationId: string,
    role: "user" | "assistant",
    content: string,
  ): ChatMessage {
    const msg: ChatMessage = {
      id: makeMsgId(),
      conversationId,
      role,
      content,
      createdAt: new Date(),
    }
    this.messages.push(msg)

    // Update conversation timestamp
    const conv = this.conversations.find((c) => c.id === conversationId)
    if (conv) {
      conv.updatedAt = new Date()
    }
    return msg
  }
}

export const chatService = new ChatService()
