import { useState, useCallback, useRef } from "react"
import {
  asChatStreamError,
  reconcileStreamedMessage,
  type ChatCategory,
  type ChatStreamError,
  type Message,
} from "@/src/types/chat"
import { chatApiService } from "@/src/services"
import { useMutation } from "@tanstack/react-query"
import { logger } from "@/src/lib/logger"

let optimisticMsgId = -1

const CHAT_UNAVAILABLE_MESSAGE =
  "지금은 상담 챗이 작동하지 않아요. 잠시 후 다시 시도해주세요."

function createChatUnavailableMessage(conversationId: number | null): Message {
  return {
    id: optimisticMsgId--,
    conversationId: conversationId ?? -1,
    role: "assistant",
    content: CHAT_UNAVAILABLE_MESSAGE,
    createdAt: new Date(),
  }
}

function streamFailureMessage(error: ChatStreamError): string {
  const suffix =
    error.code === "MAX_TOKENS" || error.finishReason === "MAX_TOKENS"
      ? "답변이 너무 길어 중간에 멈췄어요. 다시 생성해주세요."
      : error.code === "TIMEOUT"
        ? "답변 생성 시간이 초과됐어요. 다시 시도해주세요."
        : error.code === "INCOMPLETE_STREAM"
          ? "답변 연결이 중간에 끊겼어요. 다시 시도해주세요."
          : error.retryable
            ? "AI 상담 서비스에 일시적인 문제가 생겼어요. 다시 시도해주세요."
            : CHAT_UNAVAILABLE_MESSAGE

  return error.partialContentAvailable && error.partialContent
    ? `${error.partialContent}\n\n_${suffix}_`
    : suffix
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
    content: streamFailureMessage(error),
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
      }: {
        conversationId: number
        content: string
        userCategory: ChatCategory
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
        logger.error("Failed to send message", err)
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
      }: {
        content: string
        userCategory: ChatCategory
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
        logger.error("Failed to regenerate message", err)
      },
      onSettled: () => {
        setIsTyping(false)
      },
    })

  const isSending = isCreating || isSendingMessage || isRegenerating

  const categoryRef = useRef<ChatCategory | null>(null)
  categoryRef.current = category

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      if (!trimmed || isSending) return

      // Optimistic UI: 유저 버블 + 타이핑 표시를 즉시 보여줌
      const optimisticUserMsg: Message = {
        id: optimisticMsgId--,
        conversationId: convIdRef.current ?? -1,
        role: "user",
        content: trimmed,
        createdAt: new Date(),
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
        })
      } catch {
        setIsTyping(false)
      }
    },
    [isSending, createChatMutate, sendMsgMutate],
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
    if (!convIdRef.current || isSending) return

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")
    if (!lastUserMsg) return

    setMessages((prev) => {
      const lastAssistantIdx = prev.findLastIndex((m) => m.role === "assistant")
      if (lastAssistantIdx === -1) return prev
      return prev.filter((_, i) => i !== lastAssistantIdx)
    })

    setIsTyping(true)
    try {
      await regenerateMutate({
        content: lastUserMsg.content,
        userCategory: categoryRef.current ?? "NONE",
      })
    } catch {
      // The mutation already reconciles the placeholder to a retryable error.
    }
  }, [isSending, messages, regenerateMutate])

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
