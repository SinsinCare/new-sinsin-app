import { useState, useCallback, useRef, useEffect } from "react"
import type { ChatCategory } from "@/src/types/models"
import type { Message } from "@/src/types/chat"
import { chatApiService } from "@/src/services"

interface UseChatOptions {
  category: ChatCategory
  initialMessage?: string
}

let optimisticMsgId = -1

export function useChat({ category, initialMessage }: UseChatOptions) {
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const initialMessageSent = useRef(false)

  // Initialize conversation on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { conversation, greetingMessage } =
          await chatApiService.createConversation()
        if (cancelled) return
        setConversationId(conversation.id)
        setMessages([greetingMessage])
      } catch (err) {
        console.error("Failed to create conversation:", err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [category])

  // Send initial message if provided (e.g., from FAQ "추가 질문하기")
  useEffect(() => {
    if (conversationId && initialMessage && !initialMessageSent.current) {
      initialMessageSent.current = true
      sendMessage(initialMessage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, initialMessage])

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || !conversationId || isSending) return
      const trimmed = message.trim()
      setIsSending(true)

      // Optimistic user message
      const optimisticUserMsg: Message = {
        id: optimisticMsgId--,
        conversationId,
        role: "user",
        content: trimmed,
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, optimisticUserMsg])
      setIsTyping(true)

      try {
        const assistantMsg = await chatApiService.sendMessage(
          conversationId,
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
    [conversationId, isSending],
  )

  const regenerateLastMessage = useCallback(async () => {
    if (!conversationId || isSending) return

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")
    if (!lastUserMsg) return

    // Remove the last assistant message
    setMessages((prev) => {
      const lastAssistantIdx = prev.findLastIndex((m) => m.role === "assistant")
      if (lastAssistantIdx === -1) return prev
      return prev.filter((_, i) => i !== lastAssistantIdx)
    })

    setIsTyping(true)
    setIsSending(true)

    try {
      const assistantMsg = await chatApiService.sendMessage(
        conversationId,
        lastUserMsg.content,
      )
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      console.error("Failed to regenerate message:", err)
    } finally {
      setIsTyping(false)
      setIsSending(false)
    }
  }, [conversationId, isSending, messages])

  return {
    messages,
    isTyping,
    sendMessage,
    isSending,
    regenerateLastMessage,
  }
}
