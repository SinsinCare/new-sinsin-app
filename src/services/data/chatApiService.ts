import type {
  ChatService,
  ChatCategory,
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
import type { TokenRefreshResult } from "../../types/auth"
import { isMockMode } from "../../config/appConfig"
import { api, publicApi, tokenService } from "../core"

const BASE_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ??
  "<backend-api-base-url>"

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await tokenService.getRefreshToken()
  if (!refreshToken) return null

  const { data } = await publicApi.post<ApiResponse<TokenRefreshResult>>(
    "/auth/tokens/refresh",
    { refreshToken },
  )
  const { accessToken, refreshToken: newRefreshToken } = data.result
  await tokenService.setTokens(accessToken, newRefreshToken)
  return accessToken
}

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

    async createChat(category: ChatCategory) {
      const { data } = await api.post<ApiResponse<ChatCreate>>(
        "/chat/conversations",
        { category },
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

    async renameChat(conversationId: number, title: string) {
      await api.patch(`/chat/conversations/${conversationId}/title`, { title })
    },

    async getMessages(conversationId: number) {
      const { data } = await api.get<ApiResponse<MessageData[]>>(
        `/chat/conversations/${conversationId}/messages`,
      )
      return data.result.map((m) => mapMessage(m, conversationId))
    },

    async sendMessage(
      conversationId: number,
      content: string,
      userCategory: ChatCategory,
      onChunk?: (text: string) => void,
    ) {
      const token = await tokenService.getAccessToken()

      const buildFormData = () => {
        const formData = new FormData()
        formData.append("content", content)
        formData.append("messageType", "TEXT")
        formData.append("userCategory", userCategory)
        return formData
      }

      const sendWithToken = (
        accessToken: string | null,
        retryOnUnauthorized: boolean,
      ): Promise<ReturnType<typeof mapMessage>> =>
        new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open(
            "POST",
            `${BASE_URL}/chat/conversations/${conversationId}/messages`,
          )
          if (accessToken) {
            xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`)
          }
          xhr.setRequestHeader("Accept", "text/event-stream")

          let fullContent = ""
          let messageId: number | null = null
          let category: ChatCategory | null = null
          let categoryLabel: string | null = null
          let processedLength = 0
          let pendingLine = ""

          const processLine = (line: string) => {
            if (!line.startsWith("data:")) return
            const data = line.slice(5).trim()
            if (data === "[DONE]") return

            try {
              const parsed = JSON.parse(data)
              if (parsed.content != null) {
                fullContent += parsed.content
                onChunk?.(fullContent)
              }
              if (parsed.messageId != null) messageId = parsed.messageId
              if (parsed.category != null) category = parsed.category
              if (parsed.categoryLabel != null)
                categoryLabel = parsed.categoryLabel
            } catch {
              // Some older responses may stream plain text in data lines.
              if (data) {
                fullContent += data
                onChunk?.(fullContent)
              }
            }
          }

          xhr.onprogress = () => {
            const newData = xhr.responseText.substring(processedLength)
            processedLength = xhr.responseText.length

            const lines = (pendingLine + newData).split(/\r?\n/)
            pendingLine = lines.pop() ?? ""
            for (const line of lines) {
              processLine(line)
            }
          }

          xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              if (pendingLine) processLine(pendingLine)
              resolve(
                mapMessage(
                  {
                    messageId: messageId ?? -1,
                    role: "ASSISTANT",
                    content: fullContent,
                    category,
                    categoryLabel,
                    createdAt: new Date().toISOString(),
                  },
                  conversationId,
                ),
              )
            } else if (xhr.status === 401 && retryOnUnauthorized) {
              try {
                const newToken = await refreshAccessToken()
                resolve(await sendWithToken(newToken, false))
              } catch (error) {
                await tokenService.clearTokens()
                reject(error)
              }
            } else {
              reject(new Error(`sendMessage failed: ${xhr.status}`))
            }
          }

          xhr.onerror = () => {
            reject(new Error("Network error during sendMessage"))
          }

          xhr.send(buildFormData())
        })

      return sendWithToken(token, true)
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
  createChat: (category) => getChatApiService().createChat(category),
  getChatDetail: (id) => getChatApiService().getChatDetail(id),
  deleteChat: (id) => getChatApiService().deleteChat(id),
  renameChat: (id, title) => getChatApiService().renameChat(id, title),
  getMessages: (id) => getChatApiService().getMessages(id),
  sendMessage: (id, content, userCategory, onChunk) =>
    getChatApiService().sendMessage(id, content, userCategory, onChunk),
  generateSummary: (id) => getChatApiService().generateSummary(id),
}
