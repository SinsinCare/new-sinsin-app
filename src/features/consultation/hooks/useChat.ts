import { useState, useCallback, useRef } from "react"
import { Alert } from "react-native"
import type { ChatCategory, Message } from "@/src/types/chat"
import { chatApiService } from "@/src/services"
import { useMutation } from "@tanstack/react-query"
import { logger } from "@/src/lib/logger"

let optimisticMsgId = -1

export function useChat() {
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [category, setCategory] = useState<ChatCategory | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
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
                  m.id === streamingMsgId ? { ...m, content: accumulated } : m,
                ),
              )
            }
          },
        )

        // Replace streaming placeholder with final message
        setMessages((prev) =>
          prev.map((m) => (m.id === streamingMsgId ? assistantMsg : m)),
        )

        return assistantMsg
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

        const assistantMsg = await chatApiService.sendMessage(
          convIdRef.current!,
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
                  conversationId: convIdRef.current!,
                  role: "assistant",
                  content: accumulated,
                  createdAt: new Date(),
                },
              ])
            } else {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingMsgId ? { ...m, content: accumulated } : m,
                ),
              )
            }
          },
        )

        setMessages((prev) =>
          prev.map((m) => (m.id === streamingMsgId ? assistantMsg : m)),
        )

        return assistantMsg
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
          // createChat 실패 시 optimistic UI 롤백
          setMessages((prev) =>
            prev.filter((m) => m.id !== optimisticUserMsg.id),
          )
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
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMsg.id))
        setIsTyping(false)
        Alert.alert("전송 실패", "메시지 전송에 실패했습니다. 다시 시도해주세요.")
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
    await regenerateMutate({
      content: lastUserMsg.content,
      userCategory: categoryRef.current ?? "NONE",
    })
  }, [isSending, messages, regenerateMutate])

  return {
    conversationId,
    category,
    messages,
    isTyping,
    isSending,
    setCategory,
    sendMessage,
    startNewChat,
    loadConversation,
    resetChat,
    regenerateLastMessage,
  }
}
