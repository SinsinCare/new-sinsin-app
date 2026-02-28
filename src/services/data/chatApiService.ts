import type {
  ChatService,
  ChatList,
  ChatCreate,
  ChatDetail,
  MessageData,
  Summary,
} from "../../types/chat"
import {
  mapChatSummary,
  mapChatCreate,
  mapChatDetail,
  mapMessage,
} from "../../types/chat"
import type { ApiResponse } from "../../types/api"
import { isMockMode } from "../../config/appConfig"
import { api } from "../core"

function createRealChatService(): ChatService {
  return {
    async getChats() {
      const { data } = await api.get<ApiResponse<ChatList>>(
        "/chat/conversations",
      )
      return {
        conversations: data.result.conversations.map(mapChatSummary),
        totalCount: data.result.totalCount,
      }
    },

    async createChat() {
      const { data } = await api.post<ApiResponse<ChatCreate>>(
        "/chat/conversations",
      )
      return mapChatCreate(data.result)
    },

    async getChatDetail(conversationId: number) {
      const { data } = await api.get<ApiResponse<ChatDetail>>(
        `/chat/conversations/${conversationId}`,
      )
      return mapChatDetail(data.result)
    },

    async deleteChat(conversationId: number) {
      await api.delete(`/chat/conversations/${conversationId}`)
    },

    async getMessages(conversationId: number) {
      const { data } = await api.get<ApiResponse<MessageData[]>>(
        `/chat/conversations/${conversationId}/messages`,
      )
      return data.result.map((m) => mapMessage(m, conversationId))
    },

    async sendMessage(conversationId: number, content: string) {
      const { data } = await api.post<ApiResponse<MessageData>>(
        `/chat/conversations/${conversationId}/messages`,
        { content },
      )
      return mapMessage(data.result, conversationId)
    },

    async generateSummary(conversationId: number) {
      const { data } = await api.post<ApiResponse<Summary>>(
        `/chat/conversations/${conversationId}/summary`,
      )
      return {
        conversationId: data.result.conversationId,
        summary: data.result.summary,
      }
    },
  }
}

// --- Factory: mock/real switching ---

let cached: ChatService | null = null

function getChatApiService(): ChatService {
  if (cached) return cached
  if (isMockMode()) {
    const { createMockChatService } = require("./mock/mockChatService") // eslint-disable-line @typescript-eslint/no-require-imports
    cached = createMockChatService()
  } else {
    cached = createRealChatService()
  }
  return cached!
}

export const chatApiService: ChatService = {
  getChats: () => getChatApiService().getChats(),
  createChat: () => getChatApiService().createChat(),
  getChatDetail: (id) => getChatApiService().getChatDetail(id),
  deleteChat: (id) => getChatApiService().deleteChat(id),
  getMessages: (id) => getChatApiService().getMessages(id),
  sendMessage: (id, content) => getChatApiService().sendMessage(id, content),
  generateSummary: (id) => getChatApiService().generateSummary(id),
}
