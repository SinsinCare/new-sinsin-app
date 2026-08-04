import { useState, useCallback, useEffect, useRef } from "react"
import { LayoutAnimation } from "react-native"
import {
  asChatStreamError,
  dropAnswersAfterLastUser,
  dropLastTurn,
  reconcileStreamedMessage,
  type ChatCategory,
  type ChatStreamError,
  type Message,
} from "@/src/types/chat"
import { chatApiService } from "@/src/services"
import { useMutation } from "@tanstack/react-query"
import { logger } from "@/src/lib/logger"
import { presentError } from "@/src/lib/errorMessage"
import { getErrorMessage } from "@/src/lib/errorUtils"
import {
  CHAT_UNAVAILABLE_MESSAGE,
  CHAT_UNAVAILABLE_MESSAGE_EN,
  streamFailureMessage,
} from "@/src/features/consultation/utils/chatFailureCopy"
import { getAppLanguage } from "@/src/i18n"

// 낙관 메시지 id. 시각 기반 시드 — 모듈이 리로드(fast refresh)돼도 이전 상태에
// 남아 있는 id 와 겹치지 않는다. 서버 id(양수)와는 부호로 구분된다.
let optimisticMsgId = -(Date.now() % 1_000_000_000)

/**
 * 대화를 만들지 못했을 때 답변 자리에 놓는 말풍선.
 *
 * 예전에는 원인과 무관하게 늘 "연결이 잠시 불안정할 수 있으니" 였다. 실제로 이 자리에
 * 오는 실패의 상당수는 연결과 무관하다 — 만료된 로그인, `CHAT_ERROR_004`(빈 내용).
 * 그래서 문구는 `resolveError` 가 고르고, 그것이 말할 게 없을 때만 상담 화면의 문장으로
 * 돌아간다. 이 말풍선은 마지막 답변이므로 "답변 다시 받기" 가 그대로 붙는다 —
 * 해결책이 이미 한 번의 탭 거리에 있다(토스 원칙 5).
 *
 * 요청 취소는 `getErrorMessage` 가 빈 문자열을 준다. 그때는 말풍선을 만들지 않는다.
 */
function createChatUnavailableMessage(
  conversationId: number | null,
  error: unknown,
): Message | null {
  const language = getAppLanguage()
  const content = getErrorMessage(
    error,
    language === "en" ? CHAT_UNAVAILABLE_MESSAGE_EN : CHAT_UNAVAILABLE_MESSAGE,
  )
  if (!content) return null
  return {
    id: optimisticMsgId--,
    conversationId: conversationId ?? -1,
    role: "assistant",
    content,
    createdAt: new Date(),
  }
}

function reconcileStreamFailure(
  messages: Message[],
  placeholderId: number,
  conversationId: number,
  error: ChatStreamError,
): Message[] {
  const failureMessage: Message = {
    id: placeholderId,
    conversationId,
    role: "assistant",
    content: streamFailureMessage(error, getAppLanguage()),
    createdAt: new Date(),
  }
  const placeholderIndex = messages.findIndex(
    (message) => message.id === placeholderId,
  )

  if (placeholderIndex === -1) return [...messages, failureMessage]
  return messages.map((message) =>
    message.id === placeholderId ? failureMessage : message,
  )
}

export function useChat() {
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [category, setCategory] = useState<ChatCategory | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [lastError, setLastError] = useState<ChatStreamError | null>(null)
  const convIdRef = useRef<number | null>(null)
  const messagesRef = useRef<Message[]>(messages)
  messagesRef.current = messages
  /**
   * 전송·재생성의 단일 관문. isSending(리렌더 후에야 true)으로 막으면 빠른
   * 연타가 같은 턴에 두 스트림을 띄우고, 답변이 두 개 쌓인다.
   */
  const inFlightRef = useRef(false)
  const requestControllerRef = useRef<AbortController | null>(null)

  useEffect(
    () => () => {
      requestControllerRef.current?.abort()
      requestControllerRef.current = null
    },
    [],
  )

  const { mutateAsync: createChatMutate, isPending: isCreating } = useMutation({
    mutationFn: async (category: ChatCategory) => {
      const { conversation } = await chatApiService.createChat(category)
      return conversation
    },
    onError: (err) => {
      logger.error("Failed to create chat", err)
    },
  })

  const { mutateAsync: sendMsgMutate, isPending: isSendingMessage } =
    useMutation({
      mutationFn: async ({
        conversationId: convId,
        content,
        userCategory,
        imageUri,
        signal,
      }: {
        conversationId: number
        content: string
        userCategory: ChatCategory
        imageUri?: string
        signal?: AbortSignal
      }) => {
        const streamingMsgId = optimisticMsgId--
        let placeholderAdded = false
        setLastError(null)

        try {
          const assistantMsg = await chatApiService.sendMessage(
            convId,
            content,
            userCategory,
            (accumulated) => {
              if (!placeholderAdded) {
                placeholderAdded = true
                setIsTyping(false)
                setMessages((prev) => [
                  ...prev,
                  {
                    id: streamingMsgId,
                    conversationId: convId,
                    role: "assistant",
                    content: accumulated,
                    createdAt: new Date(),
                  },
                ])
              } else {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamingMsgId
                      ? { ...m, content: accumulated }
                      : m,
                  ),
                )
              }
            },
            imageUri,
            signal,
          )

          setMessages((prev) =>
            reconcileStreamedMessage(prev, streamingMsgId, assistantMsg),
          )
          return assistantMsg
        } catch (error) {
          const streamError = asChatStreamError(error)
          if (streamError.code !== "ABORTED") {
            setLastError(streamError)
            setMessages((prev) =>
              reconcileStreamFailure(prev, streamingMsgId, convId, streamError),
            )
          }
          throw streamError
        }
      },
      onError: (err) => {
        logger.warn("Failed to send message", err)
      },
      onSettled: () => {
        setIsTyping(false)
      },
    })

  const { mutateAsync: regenerateMutate, isPending: isRegenerating } =
    useMutation({
      mutationFn: async ({
        content,
        userCategory,
        imageUri,
        signal,
      }: {
        content: string
        userCategory: ChatCategory
        imageUri?: string
        signal?: AbortSignal
      }) => {
        const streamingMsgId = optimisticMsgId--
        let placeholderAdded = false
        const activeConversationId = convIdRef.current!
        setLastError(null)

        try {
          const assistantMsg = await chatApiService.sendMessage(
            activeConversationId,
            content,
            userCategory,
            (accumulated) => {
              if (!placeholderAdded) {
                placeholderAdded = true
                setIsTyping(false)
                setMessages((prev) => [
                  ...prev,
                  {
                    id: streamingMsgId,
                    conversationId: activeConversationId,
                    role: "assistant",
                    content: accumulated,
                    createdAt: new Date(),
                  },
                ])
              } else {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamingMsgId
                      ? { ...m, content: accumulated }
                      : m,
                  ),
                )
              }
            },
            imageUri,
            signal,
          )

          setMessages((prev) =>
            reconcileStreamedMessage(prev, streamingMsgId, assistantMsg),
          )
          return assistantMsg
        } catch (error) {
          const streamError = asChatStreamError(error)
          if (streamError.code !== "ABORTED") {
            setLastError(streamError)
            setMessages((prev) =>
              reconcileStreamFailure(
                prev,
                streamingMsgId,
                activeConversationId,
                streamError,
              ),
            )
          }
          throw streamError
        }
      },
      onError: (err) => {
        logger.warn("Failed to regenerate message", err)
      },
      onSettled: () => {
        setIsTyping(false)
      },
    })

  const isSending = isCreating || isSendingMessage || isRegenerating

  const categoryRef = useRef<ChatCategory | null>(null)
  categoryRef.current = category

  const sendMessage = useCallback(
    async (content: string, imageUri?: string) => {
      const trimmed = content.trim()
      // 사진만 보내는 것도 유효한 메시지다 — 텍스트 없이도 통과시킨다.
      if ((!trimmed && !imageUri) || inFlightRef.current) return
      inFlightRef.current = true
      const controller = new AbortController()
      requestControllerRef.current = controller

      try {
        // Optimistic UI: 유저 버블 + 타이핑 표시를 즉시 보여줌
        const optimisticUserMsg: Message = {
          id: optimisticMsgId--,
          conversationId: convIdRef.current ?? -1,
          role: "user",
          content: trimmed,
          createdAt: new Date(),
          imageUri,
        }
        setMessages((prev) => [...prev, optimisticUserMsg])
        setIsTyping(true)

        let activeConvId = convIdRef.current

        // 첫 메시지: 대화 생성 (UI는 이미 표시됨)
        if (activeConvId === null) {
          try {
            const conversation = await createChatMutate(
              categoryRef.current ?? "NONE",
            )
            if (
              controller.signal.aborted ||
              requestControllerRef.current !== controller
            ) {
              return
            }
            activeConvId = conversation.id
            convIdRef.current = activeConvId
            setConversationId(activeConvId)
          } catch (error) {
            const failureMessage = createChatUnavailableMessage(
              activeConvId,
              error,
            )
            if (failureMessage) {
              setMessages((prev) => [...prev, failureMessage])
            }
            setIsTyping(false)
            return
          }
        }

        try {
          await sendMsgMutate({
            conversationId: activeConvId,
            content: trimmed,
            userCategory: categoryRef.current ?? "NONE",
            imageUri,
            signal: controller.signal,
          })
        } catch {
          setIsTyping(false)
        }
      } finally {
        if (requestControllerRef.current === controller) {
          requestControllerRef.current = null
          inFlightRef.current = false
        }
      }
    },
    [createChatMutate, sendMsgMutate],
  )

  const loadConversation = useCallback(
    async (targetConvId: number) => {
      if (inFlightRef.current || isSending) return

      try {
        const { conversation, messages: loadedMessages } =
          await chatApiService.getChatDetail(targetConvId)
        convIdRef.current = conversation.id
        setConversationId(conversation.id)
        setCategory(conversation.category ?? null)
        setMessages(loadedMessages)
        setLastError(null)
      } catch (error) {
        /*
          예전에는 로그만 남기고 **화면에는 아무 일도 일어나지 않았다** — 기록 목록에서
          누른 상담이 열리지 않는데 이유도 없었다. `CHAT_ERROR_001`(지워진 상담)·
          `CHAT_ERROR_002`(다른 계정의 상담)는 여기서 가장 흔한 실패이고, 둘 다 사용자가
          할 일이 분명하다.

          맥락형 핸들러는 주지 않는다: `CHAT_ERROR_001` 의 기본 액션은 뒤로가기인데,
          이 화면에서의 뒤로가기는 상담 자체를 닫는 것이라 "목록에서 다시 고르기" 라는
          안내와 반대로 움직인다.
        */
        presentError(error, { scope: "consult-load-conversation" })
      }
    },
    [isSending],
  )

  const resetChat = useCallback(() => {
    requestControllerRef.current?.abort()
    requestControllerRef.current = null
    inFlightRef.current = false
    convIdRef.current = null
    setConversationId(null)
    setCategory(null)
    setMessages([])
    setIsTyping(false)
    setLastError(null)
  }, [])

  const startNewChat = useCallback(
    async (content: string) => {
      resetChat()
      await sendMessage(content)
    },
    [resetChat, sendMessage],
  )

  const regenerateLastMessage = useCallback(async () => {
    if (inFlightRef.current) return

    const lastUserMsg = messagesRef.current.findLast((m) => m.role === "user")
    if (!lastUserMsg) return
    // 사진만 보낸 턴은 로컬 URI 가 세션에만 있어 재전송할 원본이 없다.
    // 내용 없는 재생성은 서버 검증(INVALID_MESSAGE_CONTENT)에 걸리므로 막는다.
    if (!lastUserMsg.content.trim() && !lastUserMsg.imageUri) return

    // 대화 생성부터 실패했으면 재생성할 대화가 없다 — 질문 버블까지 걷고
    // 처음 보내던 경로로 다시 태운다. 안 그러면 버튼이 아무 일도 하지 않는다.
    if (!convIdRef.current) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setMessages(dropLastTurn)
      setLastError(null)
      await sendMessage(lastUserMsg.content, lastUserMsg.imageUri)
      return
    }

    inFlightRef.current = true
    const controller = new AbortController()
    requestControllerRef.current = controller
    try {
      // 폴백 답변이 접히고 그 자리에 타이핑이 들어오게 — 툭 끊기지 않는다.
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setMessages(dropAnswersAfterLastUser)
      setLastError(null)
      setIsTyping(true)

      await regenerateMutate({
        content: lastUserMsg.content,
        userCategory: categoryRef.current ?? "NONE",
        imageUri: lastUserMsg.imageUri,
        signal: controller.signal,
      })
    } catch {
      // The mutation already reconciles the placeholder to a retryable error.
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null
        inFlightRef.current = false
      }
    }
  }, [regenerateMutate, sendMessage])

  return {
    conversationId,
    category,
    messages,
    isTyping,
    isSending,
    lastError,
    setCategory,
    sendMessage,
    startNewChat,
    loadConversation,
    resetChat,
    regenerateLastMessage,
  }
}
