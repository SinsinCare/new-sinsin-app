import { useState, useCallback, useRef } from "react"
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
import {
  CHAT_UNAVAILABLE_MESSAGE,
  CHAT_UNAVAILABLE_MESSAGE_EN,
  streamFailureMessage,
} from "@/src/features/consultation/utils/chatFailureCopy"
import { getAppLanguage } from "@/src/i18n"

// 낙관 메시지 id. 시각 기반 시드 — 모듈이 리로드(fast refresh)돼도 이전 상태에
// 남아 있는 id 와 겹치지 않는다. 서버 id(양수)와는 부호로 구분된다.
let optimisticMsgId = -(Date.now() % 1_000_000_000)

function createChatUnavailableMessage(conversationId: number | null): Message {
  const language = getAppLanguage()
  return {
    id: optimisticMsgId--,
    conversationId: conversationId ?? -1,
    role: "assistant",
    content:
      language === "en"
        ? CHAT_UNAVAILABLE_MESSAGE_EN
        : CHAT_UNAVAILABLE_MESSAGE,
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
      }: {
        conversationId: number
        content: string
        userCategory: ChatCategory
        imageUri?: string
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
          )

          setMessages((prev) =>
            reconcileStreamedMessage(prev, streamingMsgId, assistantMsg),
          )
          return assistantMsg
        } catch (error) {
          const streamError = asChatStreamError(error)
          setLastError(streamError)
          setMessages((prev) =>
            reconcileStreamFailure(prev, streamingMsgId, convId, streamError),
          )
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
      }: {
        content: string
        userCategory: ChatCategory
        imageUri?: string
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
          )

          setMessages((prev) =>
            reconcileStreamedMessage(prev, streamingMsgId, assistantMsg),
          )
          return assistantMsg
        } catch (error) {
          const streamError = asChatStreamError(error)
          setLastError(streamError)
          setMessages((prev) =>
            reconcileStreamFailure(
              prev,
              streamingMsgId,
              activeConversationId,
              streamError,
            ),
          )
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
            activeConvId = conversation.id
            convIdRef.current = activeConvId
            setConversationId(activeConvId)
          } catch {
            setMessages((prev) => [
              ...prev,
              createChatUnavailableMessage(activeConvId),
            ])
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
          })
        } catch {
          setIsTyping(false)
        }
      } finally {
        inFlightRef.current = false
      }
    },
    [createChatMutate, sendMsgMutate],
  )

  const loadConversation = useCallback(
    async (targetConvId: number) => {
      if (isSending) return

      try {
        const { conversation, messages: loadedMessages } =
          await chatApiService.getChatDetail(targetConvId)
        convIdRef.current = conversation.id
        setConversationId(conversation.id)
        setCategory(conversation.category ?? null)
        setMessages(loadedMessages)
        setLastError(null)
      } catch (err) {
        logger.error("Failed to load conversation", err)
      }
    },
    [isSending],
  )

  const resetChat = useCallback(() => {
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
      })
    } catch {
      // The mutation already reconciles the placeholder to a retryable error.
    } finally {
      inFlightRef.current = false
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
