// === API DTO Types (match backend response exactly) ===

export type ChatStatus = "ACTIVE" | "ARCHIVED"

export type MessageRole = "USER" | "ASSISTANT" | "SYSTEM"

export type ChatCategory =
  | "FOOD_DIET"
  | "MEDICATION"
  | "LIFESTYLE"
  | "SYMPTOMS"
  | "EXAM"
  | "OTHER"

export interface ChatSummary {
  conversationId: number
  title: string
  summary: string | null
  status: ChatStatus
  messageCount: number
  createdAt: string // ISO date-time
  updatedAt: string
}

export interface ChatCreate {
  conversationId: number
  title: string
  createdAt: string
  greetingMessage: MessageData
}

export interface ChatDetail {
  conversationId: number
  title: string
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
  category?: ChatCategory // 상담 카테고리 — API에 추가 예정, 현재 undefined 허용
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

// === Mapper Functions ===

export function mapChatSummary(dto: ChatSummary): Chat {
  return {
    id: dto.conversationId,
    title: dto.title,
    summary: dto.summary ?? undefined,
    status: dto.status,
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

export function mapChatCreate(dto: ChatCreate): {
  conversation: Chat
  greetingMessage: Message
} {
  return {
    conversation: {
      id: dto.conversationId,
      title: dto.title,
      status: "ACTIVE",
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.createdAt),
    },
    greetingMessage: mapMessage(dto.greetingMessage, dto.conversationId),
  }
}

// === Service Interface ===

export interface ChatService {
  /** 대화 목록 조회 */
  getChats(): Promise<{
    conversations: Chat[]
    totalCount: number
  }>

  /** 새 대화 생성 (인사 메시지 포함) */
  createChat(): Promise<{
    conversation: Chat
    greetingMessage: Message
  }>

  /** 대화 상세 조회 (메시지 포함) */
  getChatDetail(
    conversationId: number,
  ): Promise<{ conversation: Chat; messages: Message[] }>

  /** 대화 삭제 (소프트 삭제) */
  deleteChat(conversationId: number): Promise<void>

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
