import { useState, useCallback, useRef } from "react"
import type { ChatCategory } from "@/src/types/models"
import type { Message } from "@/src/types/chat"
import { chatApiService } from "@/src/services"

let optimisticMsgId = -1

export function useChat() {
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [category, setCategory] = useState<ChatCategory | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const convIdRef = useRef<number | null>(null)

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      if (!trimmed || !category || isSending) return

      setIsSending(true)

      try {
        let activeConvId = convIdRef.current

        // 첫 메시지: 대화 생성
        if (activeConvId === null) {
          const { conversation, greetingMessage } =
            await chatApiService.createConversation()
          activeConvId = conversation.id
          convIdRef.current = activeConvId
          setConversationId(activeConvId)
          setMessages([greetingMessage])
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

        const assistantMsg = await chatApiService.sendMessage(
          activeConvId,
          trimmed,
        )
        setMessages((prev) => [...prev, assistantMsg])
      } catch (err) {
        console.error("Failed to send message:", err)
      } finally {
        setIsTyping(false)
        setIsSending(false)
      }
    },
    [category, isSending],
  )

  const loadConversation = useCallback(
    async (targetConvId: number) => {
      if (isSending) return

      try {
        const { conversation, messages: loadedMessages } =
          await chatApiService.getConversationDetail(targetConvId)
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
    setIsSending(false)
  }, [])

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
    setIsSending(true)

    try {
      const assistantMsg = await chatApiService.sendMessage(
        convIdRef.current,
        lastUserMsg.content,
      )
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      console.error("Failed to regenerate message:", err)
    } finally {
      setIsTyping(false)
      setIsSending(false)
    }
  }, [isSending, messages])

  return {
    conversationId,
    category,
    messages,
    isTyping,
    isSending,
    setCategory,
    sendMessage,
    loadConversation,
    resetChat,
    regenerateLastMessage,
  }
}
