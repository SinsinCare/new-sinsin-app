import type {
  IChatApiService,
  ConversationListDto,
  ConversationCreateDto,
  ConversationDetailDto,
  MessageDto,
  SummaryDto,
} from "../../types/chat"
import {
  mapConversationSummary,
  mapConversationCreate,
  mapConversationDetail,
  mapMessage,
} from "../../types/chat"
import type { ApiResponse } from "../../types/api"
import { isMockMode } from "../../config/appConfig"
import { api } from "../core"

function createRealChatService(): IChatApiService {
  return {
    async getConversations() {
      const { data } = await api.get<ApiResponse<ConversationListDto>>(
        "/chat/conversations",
      )
      return {
        conversations: data.result.conversations.map(mapConversationSummary),
        totalCount: data.result.totalCount,
      }
    },

    async createConversation() {
      const { data } = await api.post<ApiResponse<ConversationCreateDto>>(
        "/chat/conversations",
      )
      return mapConversationCreate(data.result)
    },

    async getConversationDetail(conversationId: number) {
      const { data } = await api.get<ApiResponse<ConversationDetailDto>>(
        `/chat/conversations/${conversationId}`,
      )
      return mapConversationDetail(data.result)
    },

    async deleteConversation(conversationId: number) {
      await api.delete(`/chat/conversations/${conversationId}`)
    },

    async getMessages(conversationId: number) {
      const { data } = await api.get<ApiResponse<MessageDto[]>>(
        `/chat/conversations/${conversationId}/messages`,
      )
      return data.result.map((m) => mapMessage(m, conversationId))
    },

    async sendMessage(conversationId: number, content: string) {
      const { data } = await api.post<ApiResponse<MessageDto>>(
        `/chat/conversations/${conversationId}/messages`,
        { content },
      )
      return mapMessage(data.result, conversationId)
    },

    async generateSummary(conversationId: number) {
      const { data } = await api.post<ApiResponse<SummaryDto>>(
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

let cached: IChatApiService | null = null

function getChatApiService(): IChatApiService {
  if (cached) return cached
  if (isMockMode()) {
    const { createMockChatService } = require("./mock/mockChatService") // eslint-disable-line @typescript-eslint/no-require-imports
    cached = createMockChatService()
  } else {
    cached = createRealChatService()
  }
  return cached!
}

export const chatApiService: IChatApiService = {
  getConversations: () => getChatApiService().getConversations(),
  createConversation: () => getChatApiService().createConversation(),
  getConversationDetail: (id) => getChatApiService().getConversationDetail(id),
  deleteConversation: (id) => getChatApiService().deleteConversation(id),
  getMessages: (id) => getChatApiService().getMessages(id),
  sendMessage: (id, content) => getChatApiService().sendMessage(id, content),
  generateSummary: (id) => getChatApiService().generateSummary(id),
}
