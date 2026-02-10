import { useState, useCallback, useRef, useEffect } from "react"
import type { ChatMessage, ChatCategory } from "@/src/types/models"
import { chatService } from "../services/chatService"
import { useUserStore } from "@/src/stores/userStore"

interface UseChatOptions {
  category: ChatCategory
  initialMessage?: string
}

// TODO: 백엔드 API 확정 후 aiService.chat() 연동으로 교체
function mockAssistantReply(message: string, category: ChatCategory): string {
  const replies: Record<ChatCategory, string[]> = {
    diet: [
      "식단 관련 좋은 질문이시네요. 만성신장질환 환자분의 식이 관리에서 가장 중요한 것은 나트륨, 칼륨, 인의 섭취량을 적절히 조절하는 것입니다.",
      "해당 음식의 영양 성분을 확인해보겠습니다. CKD 단계에 따라 권장량이 다르니 주치의와 상담하시는 것도 좋습니다.",
    ],
    medicine: [
      "의약품 관련 문의 감사합니다. 정확한 답변을 위해 현재 복용 중인 약물 정보가 필요합니다. 주치의와 상담을 권장드립니다.",
    ],
    dialysis: [
      "투석 관련 궁금증이시군요. 투석 환자분의 수분 및 영양 관리는 매우 중요합니다. 자세한 상담을 도와드리겠습니다.",
    ],
    checkup: [
      "검사 결과 해석에 대해 도움을 드리겠습니다. 다만 정확한 진단은 담당 의료진의 판단이 필요합니다.",
    ],
    transplant: [
      "신장 이식 관련 문의시 감사합니다. 이식 전후 관리에 대해 안내해드리겠습니다.",
    ],
    welfare: [
      "복지 및 지원 제도에 대해 안내해드리겠습니다. 신장질환 환자분들이 이용할 수 있는 다양한 지원 제도가 있습니다.",
    ],
  }
  const pool = replies[category] ?? replies.diet
  return pool[Math.floor(Math.random() * pool.length)]
}

export function useChat({ category, initialMessage }: UseChatOptions) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const initialMessageSent = useRef(false)
  const profile = useUserStore((s) => s.profile)

  // Initialize conversation on mount
  useEffect(() => {
    const conv = chatService.createConversation(
      profile?.uid ?? "anonymous",
      category,
    )
    setConversationId(conv.id)
  }, [category, profile?.uid])

  // Send initial message if provided (e.g., from FAQ "추가 질문하기")
  useEffect(() => {
    if (conversationId && initialMessage && !initialMessageSent.current) {
      initialMessageSent.current = true
      sendMessage(initialMessage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, initialMessage])

  const sendMessage = useCallback(
    (message: string) => {
      if (!message.trim() || !conversationId || isSending) return
      const trimmed = message.trim()
      setIsSending(true)

      // Add user message
      const userMsg = chatService.addMessage(conversationId, "user", trimmed)
      setMessages((prev) => [...prev, userMsg])
      setIsTyping(true)

      // TODO: 백엔드 연동 시 aiService.chat() 호출로 교체
      // Mock: 1-2초 딜레이 후 목 응답
      const delay = 1000 + Math.random() * 1000
      setTimeout(() => {
        const reply = mockAssistantReply(trimmed, category)
        const assistantMsg = chatService.addMessage(
          conversationId,
          "assistant",
          reply,
        )
        setMessages((prev) => [...prev, assistantMsg])
        setIsTyping(false)
        setIsSending(false)
      }, delay)
    },
    [conversationId, isSending, category],
  )

  return {
    messages,
    isTyping,
    sendMessage,
    isSending,
  }
}
