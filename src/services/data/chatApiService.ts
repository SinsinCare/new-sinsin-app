import type {
  ChatService,
  ChatCategory,
  ChatList,
  ChatCreate,
  ChatDetail,
  MessageData,
  Summary,
  ChatStreamChunkEvent,
  ChatStreamDoneEvent,
  ChatStreamErrorEvent,
  ChatStreamStartedEvent,
} from "../../types/chat"
import {
  ChatStreamError,
  mapChatSummary,
  mapChatCreate,
  mapChatDetail,
  mapMessage,
} from "../../types/chat"
import type { ApiResponse } from "../../types/api"
import { getBackendUrl, isMockMode } from "../../config/appConfig"
import { api, refreshAccessToken, tokenService } from "../core"

const BASE_URL = getBackendUrl()
export const CHAT_STREAM_TIMEOUT_MS = 120_000

interface SseEvent {
  event: string
  data: string
}

interface ChatXMLHttpRequest {
  responseText: string
  status: number
  timeout: number
  onprogress: (() => void) | null
  onload: (() => void) | null
  onerror: (() => void) | null
  ontimeout: (() => void) | null
  onabort: (() => void) | null
  open(method: string, url: string): void
  setRequestHeader(name: string, value: string): void
  send(body: unknown): void
}

interface ChatXMLHttpRequestConstructor {
  new (): ChatXMLHttpRequest
}

function createXMLHttpRequest(): ChatXMLHttpRequest {
  const constructor = (
    globalThis as unknown as { XMLHttpRequest: ChatXMLHttpRequestConstructor }
  ).XMLHttpRequest
  return new constructor()
}

class SseEventParser {
  private buffer = ""

  constructor(private readonly onEvent: (event: SseEvent) => void) {}

  push(chunk: string) {
    this.buffer += chunk
    this.drain(false)
  }

  finish() {
    this.drain(true)
  }

  private drain(flush: boolean) {
    const delimiter = /\r\n\r\n|\n\n|\r\r/
    let match = delimiter.exec(this.buffer)

    while (match) {
      const frame = this.buffer.slice(0, match.index)
      this.buffer = this.buffer.slice(match.index + match[0].length)
      this.processFrame(frame)
      match = delimiter.exec(this.buffer)
    }

    if (flush && this.buffer.length > 0) {
      const frame = this.buffer
      this.buffer = ""
      this.processFrame(frame)
    }
  }

  private processFrame(frame: string) {
    let event = "message"
    const dataLines: string[] = []

    for (const line of frame.split(/\r\n|\r|\n/)) {
      if (!line || line.startsWith(":")) continue
      const colonIndex = line.indexOf(":")
      const field = colonIndex === -1 ? line : line.slice(0, colonIndex)
      let value = colonIndex === -1 ? "" : line.slice(colonIndex + 1)
      if (value.startsWith(" ")) value = value.slice(1)

      if (field === "event") event = value
      if (field === "data") dataLines.push(value)
    }

    if (dataLines.length > 0) {
      this.onEvent({ event, data: dataLines.join("\n") })
    }
  }
}

function parseEventPayload(data: string): Record<string, unknown> {
  try {
    const payload: unknown = JSON.parse(data)
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("SSE payload must be an object")
    }
    return payload as Record<string, unknown>
  } catch {
    throw new ChatStreamError({
      code: "INVALID_SSE_EVENT",
      message: "Invalid JSON in chat stream event",
      retryable: true,
      partialContentAvailable: false,
    })
  }
}

export function createRealChatService(): ChatService {
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
          const xhr = createXMLHttpRequest()
          xhr.open(
            "POST",
            `${BASE_URL}/chat/conversations/${conversationId}/messages`,
          )
          if (accessToken) {
            xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`)
          }
          xhr.setRequestHeader("Accept", "text/event-stream")
          xhr.timeout = CHAT_STREAM_TIMEOUT_MS

          let fullContent = ""
          let doneEvent: ChatStreamDoneEvent | null = null
          let processedLength = 0
          let settled = false

          const resolveOnce = (message: ReturnType<typeof mapMessage>) => {
            if (settled) return
            settled = true
            resolve(message)
          }

          const rejectOnce = (error: unknown) => {
            if (settled) return
            settled = true
            reject(error)
          }

          const parser = new SseEventParser(({ event, data }) => {
            if (settled || data === "[DONE]") return

            try {
              const payload = parseEventPayload(data)
              const eventName =
                event === "message"
                  ? String(payload.type ?? payload.event ?? event)
                  : event

              if (eventName === "started") {
                const started = payload as unknown as ChatStreamStartedEvent
                if (
                  (typeof started.attemptId !== "string" &&
                    typeof started.attemptId !== "number") ||
                  typeof started.userMessageId !== "number" ||
                  typeof started.retry !== "boolean"
                ) {
                  throw new ChatStreamError({
                    code: "INVALID_SSE_EVENT",
                    message: "Chat started event is invalid",
                    retryable: true,
                    partialContentAvailable: fullContent.length > 0,
                    partialContent: fullContent || undefined,
                  })
                }
                if (started.retry && fullContent.length > 0) {
                  fullContent = ""
                  onChunk?.(fullContent)
                }
                return
              }

              if (eventName === "chunk") {
                const chunk = payload as unknown as ChatStreamChunkEvent
                if (typeof chunk.content !== "string") {
                  throw new ChatStreamError({
                    code: "INVALID_SSE_EVENT",
                    message: "Chat chunk is missing content",
                    retryable: true,
                    partialContentAvailable: fullContent.length > 0,
                    partialContent: fullContent || undefined,
                  })
                }
                fullContent += chunk.content
                onChunk?.(fullContent)
                return
              }

              if (eventName === "done") {
                const done = payload as unknown as ChatStreamDoneEvent
                if (typeof done.messageId !== "number") {
                  throw new ChatStreamError({
                    code: "INVALID_SSE_EVENT",
                    message: "Chat completion is missing messageId",
                    retryable: true,
                    partialContentAvailable: fullContent.length > 0,
                    partialContent: fullContent || undefined,
                  })
                }
                if (done.finishReason !== "STOP") {
                  throw new ChatStreamError({
                    code: done.finishReason || "INCOMPLETE_STREAM",
                    message: `Chat stopped with ${done.finishReason || "an unknown reason"}`,
                    retryable: true,
                    partialContentAvailable: fullContent.length > 0,
                    finishReason: done.finishReason,
                    partialContent: fullContent || undefined,
                  })
                }
                doneEvent = done
                return
              }

              if (eventName === "error") {
                const streamError = payload as unknown as ChatStreamErrorEvent
                throw new ChatStreamError({
                  code: streamError.code || "PROVIDER_ERROR",
                  message: streamError.message || "Chat provider error",
                  retryable: streamError.retryable ?? false,
                  partialContentAvailable:
                    streamError.partialContentAvailable ??
                    fullContent.length > 0,
                  finishReason: streamError.finishReason,
                  partialContent: fullContent || undefined,
                })
              }
            } catch (error) {
              if (error instanceof ChatStreamError) {
                const partialContent = error.partialContent ?? fullContent
                rejectOnce(
                  new ChatStreamError({
                    code: error.code,
                    message: error.message,
                    retryable: error.retryable,
                    partialContentAvailable:
                      error.partialContentAvailable ||
                      partialContent.length > 0,
                    finishReason: error.finishReason,
                    partialContent: partialContent || undefined,
                  }),
                )
              } else {
                rejectOnce(error)
              }
            }
          })

          xhr.onprogress = () => {
            const newData = xhr.responseText.substring(processedLength)
            processedLength = xhr.responseText.length
            parser.push(newData)
          }

          xhr.onload = async () => {
            if (settled) return
            if (xhr.status >= 200 && xhr.status < 300) {
              parser.finish()
              if (settled) return

              const completion = doneEvent as ChatStreamDoneEvent | null
              if (!completion || completion.finishReason !== "STOP") {
                rejectOnce(
                  new ChatStreamError({
                    code: "INCOMPLETE_STREAM",
                    message: "Chat stream ended before a STOP completion",
                    retryable: true,
                    partialContentAvailable: fullContent.length > 0,
                    partialContent: fullContent || undefined,
                  }),
                )
                return
              }

              resolveOnce(
                mapMessage(
                  {
                    messageId: completion.messageId,
                    role: "ASSISTANT",
                    content: fullContent,
                    category: null,
                    categoryLabel: null,
                    createdAt: new Date().toISOString(),
                  },
                  conversationId,
                ),
              )
            } else if (xhr.status === 401 && retryOnUnauthorized) {
              try {
                const newToken = await refreshAccessToken()
                resolveOnce(await sendWithToken(newToken, false))
              } catch (error) {
                rejectOnce(error)
              }
            } else {
              rejectOnce(
                new ChatStreamError({
                  code: `HTTP_${xhr.status}`,
                  message: `sendMessage failed: ${xhr.status}`,
                  retryable: xhr.status >= 500,
                  partialContentAvailable: fullContent.length > 0,
                  partialContent: fullContent || undefined,
                }),
              )
            }
          }

          xhr.onerror = () => {
            rejectOnce(
              new ChatStreamError({
                code: "NETWORK_ERROR",
                message: "Network error during sendMessage",
                retryable: true,
                partialContentAvailable: fullContent.length > 0,
                partialContent: fullContent || undefined,
              }),
            )
          }

          xhr.ontimeout = () => {
            rejectOnce(
              new ChatStreamError({
                code: "TIMEOUT",
                message: "Chat stream timed out",
                retryable: true,
                partialContentAvailable: fullContent.length > 0,
                partialContent: fullContent || undefined,
              }),
            )
          }

          xhr.onabort = () => {
            rejectOnce(
              new ChatStreamError({
                code: "ABORTED",
                message: "Chat stream was aborted",
                retryable: true,
                partialContentAvailable: fullContent.length > 0,
                partialContent: fullContent || undefined,
              }),
            )
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
