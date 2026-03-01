import { useState, useCallback, useRef } from "react"
import type { ChatCategory, Message } from "@/src/types/chat"
import { chatApiService } from "@/src/services"
import { useMutation } from "@tanstack/react-query"

let optimisticMsgId = -1

export function useChat() {
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [category, setCategory] = useState<ChatCategory | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const convIdRef = useRef<number | null>(null)

  const { mutateAsync: createChatMutate, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      const { conversation } = await chatApiService.createChat()
      return conversation
    },
    onError: (err) => {
      console.error("Failed to create chat:", err)
    },
  })

  const { mutateAsync: sendMsgMutate, isPending: isSendingMessage } =
    useMutation({
      mutationFn: async ({
        conversationId: convId,
        content,
      }: {
        conversationId: number
        content: string
      }) => {
        const assistantMsg = await chatApiService.sendMessage(convId, content)
        return assistantMsg
      },
      onSuccess: (assistantMsg) => {
        setMessages((prev) => [...prev, assistantMsg])
      },
      onError: (err) => {
        console.error("Failed to send message:", err)
      },
      onSettled: () => {
        setIsTyping(false)
      },
    })

  const { mutateAsync: regenerateMutate, isPending: isRegenerating } =
    useMutation({
      mutationFn: async (content: string) => {
        const assistantMsg = await chatApiService.sendMessage(
          convIdRef.current!,
          content,
        )
        return assistantMsg
      },
      onSuccess: (assistantMsg) => {
        setMessages((prev) => [...prev, assistantMsg])
      },
      onError: (err) => {
        console.error("Failed to regenerate message:", err)
      },
      onSettled: () => {
        setIsTyping(false)
      },
    })

  const isSending = isCreating || isSendingMessage || isRegenerating

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      // if (!trimmed || !category || isSending) return
      if (!trimmed || isSending) return

      let activeConvId = convIdRef.current

      // 첫 메시지: 대화 생성
      if (activeConvId === null) {
        const conversation = await createChatMutate()
        activeConvId = conversation.id
        convIdRef.current = activeConvId
        setConversationId(activeConvId)
      }

      // Optimistic user message
      const optimisticUserMsg: Message = {
        id: optimisticMsgId--,
        conversationId: activeConvId,
        role: "user",
        content: trimmed,
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, optimisticUserMsg])
      setIsTyping(true)

      await sendMsgMutate({ conversationId: activeConvId, content: trimmed })
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
        console.error("Failed to load conversation:", err)
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
    await regenerateMutate(lastUserMsg.content)
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
