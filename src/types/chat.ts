// === API DTO Types (match backend response exactly) ===

export type ChatStatus = "ACTIVE" | "ARCHIVED"

export type MessageRole = "USER" | "ASSISTANT" | "SYSTEM"

/**
 * 런타임 목록에서 타입을 파생시킨다.
 *
 * 딥링크로 들어온 분류 문자열(`consultPrompt` 경로)을 검증하려면 **값**이 필요한데,
 * 타입만 있으면 목록을 손으로 한 벌 더 적게 되고 그 두 벌은 언젠가 갈린다.
 */
export const CHAT_CATEGORIES = [
  "FOOD_DIET",
  "MEDICATION",
  "LIFESTYLE",
  "SYMPTOMS",
  "EXAM",
  "NONE",
] as const

export type ChatCategory = (typeof CHAT_CATEGORIES)[number]

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
  category?: ChatCategory | null
  categoryLabel?: string | null
  role?: MessageRole
  createdAt?: string
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
    message:
      error instanceof Error
        ? error.message
        : "답변을 받지 못했어요. 잠시 후 다시 보내 주세요.",
    retryable: false,
    partialContentAvailable: false,
  })
}

export interface Summary {
  conversationId: number
  summary: string
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
  /**
   * 이 세션에서 첨부해 보낸 사진의 로컬 URI (클라이언트 전용 낙관 표시).
   * 서버는 "[이미지]" 텍스트로 저장하므로 히스토리 재로드 시에는 없다.
   */
  imageUri?: string
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

/**
 * 답변 다시 받기 직전 정리 — 마지막 질문 뒤에 붙은 답변은 하나도 남기지 않는다.
 * 실패 폴백이 그 자리에 남으면 새 답변과 나란히 서서, 어느 쪽이 유효한 의료
 * 답변인지 알 수 없게 된다. 답변이 여러 개 쌓인 경우(중복 재생성)도 함께 걷는다.
 */
export function dropAnswersAfterLastUser(messages: Message[]): Message[] {
  const lastUserIndex = messages.findLastIndex(
    (message) => message.role === "user",
  )
  if (lastUserIndex === -1) return messages
  // 걷어낼 게 없으면 같은 배열을 돌려 불필요한 리렌더를 만들지 않는다.
  if (lastUserIndex === messages.length - 1) return messages
  return messages.slice(0, lastUserIndex + 1)
}

/**
 * 대화 생성부터 실패한 턴은 재생성할 대화가 서버에 없다. 질문까지 걷어내고
 * 처음 보내던 경로(대화 생성 + 전송)로 다시 태워야 질문 버블이 겹치지 않는다.
 */
export function dropLastTurn(messages: Message[]): Message[] {
  const lastUserIndex = messages.findLastIndex(
    (message) => message.role === "user",
  )
  if (lastUserIndex === -1) return messages
  return messages.slice(0, lastUserIndex)
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

  /** 메시지 전송 → AI 응답 SSE 수신. imageUri 가 있으면 IMAGE 멀티모달 전송. */
  sendMessage(
    conversationId: number,
    content: string,
    userCategory: ChatCategory,
    onChunk?: (text: string) => void,
    imageUri?: string,
  ): Promise<Message>

  /** 대화 요약 생성 */
  generateSummary(
    conversationId: number,
  ): Promise<{ conversationId: number; summary: string }>
}
