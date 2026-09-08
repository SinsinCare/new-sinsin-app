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
  ConsultActivity,
} from "../../types/chat"
import {
  ChatStreamError,
  MAX_CHAT_MESSAGE_CONTENT_LENGTH,
  mapChatSummary,
  mapChatCreate,
  mapChatDetail,
  mapMessage,
  parseConsultActivity,
} from "../../types/chat"
import type { ApiResponse } from "../../types/api"
import { getBackendUrl, isMockMode } from "../../config/appConfig"
import { api, refreshAccessToken, tokenService } from "../core"
import { getAppLanguage } from "@/src/i18n"
import { prepareImageUpload } from "@/src/shared/utils/preparedImageUpload"

const BASE_URL = getBackendUrl()
export const CHAT_STREAM_TIMEOUT_MS = 120_000
export const CHAT_STREAM_MAX_FRAME_CHARS = 256 * 1024
export const CHAT_STREAM_MAX_CONTENT_CHARS = 128 * 1024
export const CHAT_STREAM_MAX_WIRE_CHARS = 1024 * 1024

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
  abort(): void
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
  private parts: string[] = []
  private frameLength = 0
  private tail = ""
  private readonly delimiter = /\r\n\r\n|\n\n|\r\r/g

  constructor(private readonly onEvent: (event: SseEvent) => void) {}

  push(chunk: string) {
    // Only the last three characters can start a delimiter split across reads.
    // Keep the rest in fragments so tiny chunks never rescan/copy the whole frame.
    const buffer = this.tail + chunk
    this.tail = ""
    this.delimiter.lastIndex = 0
    let start = 0
    let match: RegExpExecArray | null
    while ((match = this.delimiter.exec(buffer)) !== null) {
      this.append(buffer.slice(start, match.index))
      this.emitFrame()
      start = match.index + match[0].length
    }
    const tailStart = Math.max(start, buffer.length - 3)
    this.append(buffer.slice(start, tailStart))
    this.tail = buffer.slice(tailStart)
    if (this.frameLength + this.tail.length > CHAT_STREAM_MAX_FRAME_CHARS) {
      throw streamTooLargeError()
    }
  }

  finish() {
    this.append(this.tail)
    this.tail = ""
    if (this.frameLength > 0) this.emitFrame()
  }

  private append(part: string) {
    this.frameLength += part.length
    if (this.frameLength > CHAT_STREAM_MAX_FRAME_CHARS)
      throw streamTooLargeError()
    if (part.length > 0) this.parts.push(part)
  }

  private emitFrame() {
    const frame = this.parts.join("")
    this.parts = []
    this.frameLength = 0
    this.processFrame(frame)
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

function streamTooLargeError(): ChatStreamError {
  return new ChatStreamError({
    code: "STREAM_TOO_LARGE",
    message: "Chat stream exceeded the client safety limit",
    retryable: false,
    partialContentAvailable: false,
  })
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
      /** 첨부 이미지 로컬 URI. 있으면 IMAGE 메시지로 보내고 서버가 멀티모달로 해석한다. */
      imageUri?: string,
      signal?: AbortSignal,
      onActivity?: (activity: ConsultActivity) => void,
      options?: {
        regenerateMessageId?: number
        recipeCards?: boolean
        dataCards?: boolean
      },
    ) {
      if (content.length > MAX_CHAT_MESSAGE_CONTENT_LENGTH) {
        throw new ChatStreamError({
          code: "MESSAGE_TOO_LONG",
          message: `Message exceeds ${MAX_CHAT_MESSAGE_CONTENT_LENGTH} characters`,
          retryable: false,
          partialContentAvailable: false,
        })
      }
      const preparedImage = imageUri
        ? await prepareImageUpload(imageUri, {
            width: 1600,
            compress: 0.78,
            cachePrefix: "chat_tmp",
          })
        : null
      let token: string | null
      try {
        token = await tokenService.getAccessToken()
      } catch (error) {
        await preparedImage?.cleanup()
        throw error
      }

      const buildFormData = () => {
        const formData = new FormData()
        formData.append("content", content)
        // 사진만 → IMAGE, 사진+글 → MIXED(서버가 글과 사진을 함께 해석), 글만 → TEXT.
        formData.append(
          "messageType",
          imageUri ? (content.trim() ? "MIXED" : "IMAGE") : "TEXT",
        )
        formData.append("userCategory", userCategory)
        if (options?.regenerateMessageId !== undefined)
          formData.append(
            "regenerateMessageId",
            String(options.regenerateMessageId),
          )
        if (preparedImage) {
          // RN FormData 파일 파트 — fetch/XHR 이 멀티파트로 직렬화한다.
          formData.append("files", {
            uri: preparedImage.uri,
            name: `chat_${Date.now()}.jpg`,
            type: "image/jpeg",
          } as unknown as Blob)
        }
        return formData
      }

      const sendWithToken = (
        accessToken: string | null,
        retryOnUnauthorized: boolean,
      ): Promise<ReturnType<typeof mapMessage>> =>
        new Promise((resolve, reject) => {
          const xhr = createXMLHttpRequest()
          const abortFromCaller = () => xhr.abort()
          if (signal?.aborted) {
            reject(
              new ChatStreamError({
                code: "ABORTED",
                message: "Chat stream was aborted",
                retryable: true,
                partialContentAvailable: false,
              }),
            )
            return
          }
          xhr.open(
            "POST",
            `${BASE_URL}/chat/conversations/${conversationId}/messages`,
          )
          if (accessToken) {
            xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`)
          }
          xhr.setRequestHeader(
            "Accept-Language",
            getAppLanguage() === "en" ? "en-US" : "ko-KR",
          )
          xhr.setRequestHeader("Accept", "text/event-stream")
          if (options?.dataCards)
            xhr.setRequestHeader("X-Consult-Data-Cards", "1")
          if (options?.recipeCards)
            xhr.setRequestHeader("X-Consult-Recipe-Cards", "1")
          xhr.timeout = CHAT_STREAM_TIMEOUT_MS

          let fullContent = ""
          let doneEvent: ChatStreamDoneEvent | null = null
          let processedLength = 0
          let settled = false

          const resolveOnce = (message: ReturnType<typeof mapMessage>) => {
            if (settled) return
            settled = true
            signal?.removeEventListener("abort", abortFromCaller)
            resolve(message)
          }

          const rejectOnce = (error: unknown) => {
            if (settled) return
            settled = true
            signal?.removeEventListener("abort", abortFromCaller)
            reject(error)
          }

          const failStream = (error: unknown) => {
            if (error instanceof ChatStreamError) {
              const partialContent = error.partialContent ?? fullContent
              rejectOnce(
                new ChatStreamError({
                  code: error.code,
                  message: error.message,
                  retryable: error.retryable,
                  partialContentAvailable:
                    error.partialContentAvailable || partialContent.length > 0,
                  finishReason: error.finishReason,
                  partialContent: partialContent || undefined,
                }),
              )
            } else {
              rejectOnce(error)
            }
            xhr.abort()
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
                if (
                  chunk.content.length >
                  CHAT_STREAM_MAX_CONTENT_CHARS - fullContent.length
                ) {
                  throw streamTooLargeError()
                }
                fullContent += chunk.content
                onChunk?.(fullContent)
                return
              }

              if (eventName === "activity") {
                const activity = parseConsultActivity(payload)
                if (activity) onActivity?.(activity)
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
              failStream(error)
            }
          })

          const processProgress = () => {
            if (settled) return
            try {
              if (xhr.responseText.length > CHAT_STREAM_MAX_WIRE_CHARS) {
                throw streamTooLargeError()
              }
              const newData = xhr.responseText.substring(processedLength)
              processedLength = xhr.responseText.length
              parser.push(newData)
            } catch (error) {
              failStream(error)
            }
          }

          xhr.onprogress = processProgress

          xhr.onload = async () => {
            if (settled) return
            if (xhr.status >= 200 && xhr.status < 300) {
              processProgress()
              if (settled) return
              try {
                parser.finish()
              } catch (error) {
                failStream(error)
              }
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
                    activities: completion.activities,
                    role: completion.role ?? "ASSISTANT",
                    content: fullContent,
                    category: completion.category ?? null,
                    categoryLabel: completion.categoryLabel ?? null,
                    createdAt: completion.createdAt ?? new Date().toISOString(),
                  },
                  conversationId,
                ),
              )
            } else if (xhr.status === 401 && retryOnUnauthorized) {
              try {
                const currentToken = await tokenService.getAccessToken()
                const retryToken =
                  currentToken && currentToken !== accessToken
                    ? currentToken
                    : await refreshAccessToken()
                resolveOnce(await sendWithToken(retryToken, false))
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

          if (signal?.aborted) {
            xhr.onabort?.()
            return
          }
          signal?.addEventListener("abort", abortFromCaller, { once: true })
          xhr.send(buildFormData())
        })

      try {
        return await sendWithToken(token, true)
      } finally {
        await preparedImage?.cleanup()
      }
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
  sendMessage: (...args) => getChatApiService().sendMessage(...args),
  generateSummary: (id) => getChatApiService().generateSummary(id),
}
