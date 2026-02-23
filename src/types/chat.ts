import type { ChatCategory } from "./models"

// === API DTO Types (match backend response exactly) ===

export type ConversationStatus = "ACTIVE" | "ARCHIVED"

export type MessageRole = "USER" | "ASSISTANT" | "SYSTEM"

export type AiMessageCategory =
  | "DIET_POTASSIUM"
  | "DIET_SODIUM"
  | "DIET_PROTEIN"
  | "MEDICATION"
  | "SYMPTOMS"
  | "LIFESTYLE"
  | "DIALYSIS"
  | "GENERAL"
  | "OTHER"

export interface ConversationSummaryDto {
  conversationId: number
  title: string
  summary: string | null
  status: ConversationStatus
  messageCount: number
  createdAt: string // ISO date-time
  updatedAt: string
}

export interface ConversationCreateDto {
  conversationId: number
  title: string
  createdAt: string
  greetingMessage: MessageDto
}

export interface ConversationDetailDto {
  conversationId: number
  title: string
  summary: string | null
  status: ConversationStatus
  createdAt: string
  updatedAt: string
  messages: MessageDto[]
}

export interface ConversationListDto {
  conversations: ConversationSummaryDto[]
  totalCount: number
}

export interface MessageDto {
  messageId: number
  role: MessageRole
  content: string
  category: AiMessageCategory | null
  categoryLabel: string | null
  createdAt: string
}

export interface MessageSendRequestDto {
  content: string // max 5000 chars
}

export interface SummaryDto {
  conversationId: number
  summary: string // JSON format
}

// === Domain Models (app-internal, Date objects, camelCase) ===

export interface Conversation {
  id: number
  title: string
  summary?: string
  status: ConversationStatus
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
  aiCategory?: AiMessageCategory
  aiCategoryLabel?: string
  createdAt: Date
}

// === Mapper Functions ===

export function mapConversationSummary(
  dto: ConversationSummaryDto,
): Conversation {
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

export function mapConversationDetail(
  dto: ConversationDetailDto,
): { conversation: Conversation; messages: Message[] } {
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

export function mapMessage(dto: MessageDto, conversationId: number): Message {
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

export function mapConversationCreate(
  dto: ConversationCreateDto,
): { conversation: Conversation; greetingMessage: Message } {
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

export interface IChatApiService {
  /** 대화 목록 조회 */
  getConversations(): Promise<{ conversations: Conversation[]; totalCount: number }>

  /** 새 대화 생성 (인사 메시지 포함) */
  createConversation(): Promise<{ conversation: Conversation; greetingMessage: Message }>

  /** 대화 상세 조회 (메시지 포함) */
  getConversationDetail(conversationId: number): Promise<{ conversation: Conversation; messages: Message[] }>

  /** 대화 삭제 (소프트 삭제) */
  deleteConversation(conversationId: number): Promise<void>

  /** 메시지 목록 조회 */
  getMessages(conversationId: number): Promise<Message[]>

  /** 메시지 전송 → AI 응답 수신 */
  sendMessage(conversationId: number, content: string): Promise<Message>

  /** 대화 요약 생성 */
  generateSummary(conversationId: number): Promise<{ conversationId: number; summary: string }>
}
