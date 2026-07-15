// === API DTO Types (match backend response exactly) ===

export type ChatStatus = "ACTIVE" | "ARCHIVED"

export type MessageRole = "USER" | "ASSISTANT" | "SYSTEM"

export type ChatCategory =
  | "FOOD_DIET"
  | "MEDICATION"
  | "LIFESTYLE"
  | "SYMPTOMS"
  | "EXAM"
  | "NONE"

export interface ChatSummary {
  conversationId: number
  title: string
  summary: string | null
  status: ChatStatus
  category: ChatCategory | null
  categoryLabel: string | null
  messageCount: number
  createdAt: string // ISO date-time
  updatedAt: string
}

export interface ChatCreate {
  conversationId: number
  title: string
  category: ChatCategory | null
  categoryLabel: string | null
  createdAt: string
}

export interface ChatDetail {
  conversationId: number
  title: string
  category: ChatCategory | null
  categoryLabel: string | null
  summary: string | null
  status: ChatStatus
  createdAt: string
  updatedAt: string
  messages: MessageData[]
}

export interface ChatList {
  conversations: ChatSummary[]
  totalCount: number
}

export interface MessageData {
  messageId: number
  role: MessageRole
  content: string
  category: ChatCategory | null
  categoryLabel: string | null
  createdAt: string
}

export type MessageType = "TEXT" | "IMAGE" | "MIXED"

export interface MessageSendRequest {
  content: string // max 5000 chars
  messageType: MessageType
  userCategory: ChatCategory
  files?: File[] // binary files for IMAGE/MIXED
}

export type ChatStreamFinishReason = "STOP" | "MAX_TOKENS" | (string & {})

export interface ChatStreamStartedEvent {
  attemptId: string | number
  userMessageId: number
  retry: boolean
}

export interface ChatStreamChunkEvent {
  content: string
}

export interface ChatStreamDoneEvent {
  messageId: number
  finishReason: ChatStreamFinishReason
}

export interface ChatStreamErrorEvent {
  code: string
  message: string
  retryable: boolean
  partialContentAvailable: boolean
  finishReason?: ChatStreamFinishReason
}

export interface ChatStreamErrorOptions extends ChatStreamErrorEvent {
  partialContent?: string
}

/** A terminal SSE or transport failure that callers can present or retry. */
export class ChatStreamError extends Error {
  readonly code: string
  readonly retryable: boolean
  readonly partialContentAvailable: boolean
  readonly finishReason?: ChatStreamFinishReason
  readonly partialContent?: string

  constructor(options: ChatStreamErrorOptions) {
    super(options.message)
    this.name = "ChatStreamError"
    this.code = options.code
    this.retryable = options.retryable
    this.partialContentAvailable = options.partialContentAvailable
    this.finishReason = options.finishReason
    this.partialContent = options.partialContent
    Object.setPrototypeOf(this, ChatStreamError.prototype)
  }
}

export function asChatStreamError(error: unknown): ChatStreamError {
  if (error instanceof ChatStreamError) return error
  return new ChatStreamError({
    code: "UNKNOWN",
    message: error instanceof Error ? error.message : "Unknown chat error",
    retryable: false,
    partialContentAvailable: false,
  })
}

export interface Summary {
  conversationId: number
  summary: string // JSON format
}

// === Domain Models (app-internal, Date objects, camelCase) ===

export interface Chat {
  id: number
  title: string
  summary?: string
  status: ChatStatus
  category: ChatCategory | null
  categoryLabel?: string
  messageCount?: number
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  id: number
  conversationId: number
  role: "user" | "assistant" | "system"
  content: string
  aiCategory?: ChatCategory
  aiCategoryLabel?: string
  createdAt: Date
}

export function reconcileStreamedMessage(
  messages: Message[],
  placeholderId: number,
  finalMessage: Message,
): Message[] {
  const targetIndex = messages.findIndex(
    (message) => message.id === placeholderId || message.id === finalMessage.id,
  )
  const withoutDuplicates = messages.filter(
    (message) => message.id !== placeholderId && message.id !== finalMessage.id,
  )

  if (targetIndex === -1) return [...withoutDuplicates, finalMessage]

  const insertionIndex = messages
    .slice(0, targetIndex)
    .filter(
      (message) =>
        message.id !== placeholderId && message.id !== finalMessage.id,
    ).length
  withoutDuplicates.splice(insertionIndex, 0, finalMessage)
  return withoutDuplicates
}

// === Mapper Functions ===

export function mapChatSummary(dto: ChatSummary): Chat {
  return {
    id: dto.conversationId,
    title: dto.title,
    summary: dto.summary ?? undefined,
    status: dto.status,
    category: dto.category,
    categoryLabel: dto.categoryLabel ?? undefined,
    messageCount: dto.messageCount,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}

export function mapChatDetail(dto: ChatDetail): {
  conversation: Chat
  messages: Message[]
} {
  return {
    conversation: {
      id: dto.conversationId,
      title: dto.title,
      summary: dto.summary ?? undefined,
      status: dto.status,
      category: dto.category,
      categoryLabel: dto.categoryLabel ?? undefined,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
    },
    messages: dto.messages.map((m) => mapMessage(m, dto.conversationId)),
  }
}

export function mapMessage(dto: MessageData, conversationId: number): Message {
  return {
    id: dto.messageId,
    conversationId,
    role: dto.role.toLowerCase() as Message["role"],
    content: dto.content,
    aiCategory: dto.category ?? undefined,
    aiCategoryLabel: dto.categoryLabel ?? undefined,
    createdAt: new Date(dto.createdAt),
  }
}

export function mapChatCreate(dto: ChatCreate): { conversation: Chat } {
  return {
    conversation: {
      id: dto.conversationId,
      title: dto.title,
      status: "ACTIVE",
      category: dto.category,
      categoryLabel: dto.categoryLabel ?? undefined,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.createdAt),
    },
  }
}

// === Service Interface ===

export interface ChatService {
  /** 대화 목록 조회 */
  getChats(): Promise<{
    conversations: Chat[]
    totalCount: number
  }>

  /** 새 대화 생성 */
  createChat(category: ChatCategory): Promise<{ conversation: Chat }>

  /** 대화 상세 조회 (메시지 포함) */
  getChatDetail(
    conversationId: number,
  ): Promise<{ conversation: Chat; messages: Message[] }>

  /** 대화 삭제 (소프트 삭제) */
  deleteChat(conversationId: number): Promise<void>

  /** 상담기록 이름 변경 */
  renameChat(conversationId: number, title: string): Promise<void>

  /** 메시지 목록 조회 */
  getMessages(conversationId: number): Promise<Message[]>

  /** 메시지 전송 → AI 응답 SSE 수신 */
  sendMessage(
    conversationId: number,
    content: string,
    userCategory: ChatCategory,
    onChunk?: (text: string) => void,
  ): Promise<Message>

  /** 대화 요약 생성 */
  generateSummary(
    conversationId: number,
  ): Promise<{ conversationId: number; summary: string }>
}
