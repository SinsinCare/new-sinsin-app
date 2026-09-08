import { useState, useCallback, useEffect, useRef } from "react"
import {
  asChatStreamError,
  dropAnswersAfterLastUser,
  reconcileStreamedMessage,
  mergeConsultActivity,
  finishConsultActivity,
  type ConsultActivity,
  type ChatCategory,
  type ChatStreamError,
  type Message,
} from "@/src/types/chat"
import { chatApiService } from "@/src/services"
import { presentError, resolveError } from "@/src/lib/errorMessage"
import { getErrorMessage } from "@/src/lib/errorUtils"
import {
  CHAT_UNAVAILABLE_MESSAGE,
  CHAT_UNAVAILABLE_MESSAGE_EN,
  streamFailureMessage,
} from "../utils/chatFailureCopy"
import { getAppLanguage } from "@/src/i18n"
import { ConsultRequest } from "../utils/consultRequest"

let optimisticMsgId = -(Date.now() % 1_000_000_000)

export function useChat({
  recipeCards = false,
  dataCards = false,
}: { recipeCards?: boolean; dataCards?: boolean } = {}) {
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [category, setCategory] = useState<ChatCategory | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [busy, setBusy] = useState<"sending" | "loading" | null>(null)
  const [lastError, setLastError] = useState<ChatStreamError | null>(null)
  const request = useRef(new ConsultRequest()).current
  const convIdRef = useRef<number | null>(null)
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const categoryRef = useRef(category)
  categoryRef.current = category
  const busyRef = useRef(busy)
  busyRef.current = busy

  useEffect(() => () => request.cancel(), [request])

  const runTurn = useCallback(
    async (content: string, imageUri?: string, retry = false) => {
      const trimmed = content.trim()
      if ((!trimmed && !imageUri) || request.active) return
      const controller = request.begin()
      const replyId = optimisticMsgId--
      let activeConvId = convIdRef.current
      let creating = activeConvId === null
      let activities: ConsultActivity[] = []
      let receivedText = ""
      const priorAnswer = retry
        ? messagesRef.current.findLast(
            (message) => message.role === "assistant",
          )
        : undefined
      const regenerateMessageId =
        priorAnswer?.regenerateMessageId ??
        (priorAnswer && priorAnswer.id > 0 ? priorAnswer.id : undefined)
      setBusy("sending")
      setIsTyping(true)
      setLastError(null)
      const placeholder: Message = {
        id: replyId,
        clientKey: `local-${replyId}`,
        conversationId: activeConvId ?? -1,
        role: "assistant",
        content: "",
        createdAt: new Date(),
        activities: [],
        regenerateMessageId,
      }
      if (retry) {
        setMessages((prev) => [...dropAnswersAfterLastUser(prev), placeholder])
      } else {
        const question: Message = {
          id: optimisticMsgId--,
          conversationId: activeConvId ?? -1,
          role: "user",
          content: trimmed,
          imageUri,
          createdAt: new Date(),
        }
        setMessages((prev) => [...prev, question, placeholder])
      }
      try {
        if (activeConvId === null) {
          const { conversation } = await chatApiService.createChat(
            categoryRef.current ?? "NONE",
          )
          if (!request.owns(controller)) return
          activeConvId = conversation.id
          convIdRef.current = activeConvId
          setConversationId(activeConvId)
        }
        creating = false
        const reply = await chatApiService.sendMessage(
          activeConvId,
          trimmed,
          categoryRef.current ?? "NONE",
          (accumulated) => {
            if (!request.owns(controller)) return
            receivedText = accumulated
            setIsTyping(false)
            setMessages((prev) =>
              reconcileStreamedMessage(prev, replyId, {
                id: replyId,
                conversationId: activeConvId!,
                role: "assistant",
                content: accumulated,
                activities,
                regenerateMessageId,
                createdAt: new Date(),
              }),
            )
          },
          imageUri,
          controller.signal,
          (activity) => {
            if (!request.owns(controller)) return
            activities = mergeConsultActivity(activities, activity)
            setIsTyping(false)
            setMessages((prev) =>
              reconcileStreamedMessage(prev, replyId, {
                id: replyId,
                conversationId: activeConvId!,
                role: "assistant",
                content: receivedText,
                createdAt: new Date(),
                activities,
                regenerateMessageId,
              }),
            )
          },
          {
            ...(regenerateMessageId === undefined
              ? {}
              : { regenerateMessageId }),
            ...(recipeCards ? { recipeCards: true } : {}),
            ...(dataCards ? { dataCards: true } : {}),
          },
        )
        if (!request.owns(controller)) return
        setMessages((prev) =>
          reconcileStreamedMessage(prev, replyId, {
            ...reply,
            activities:
              reply.activities ?? finishConsultActivity(activities, "complete"),
          }),
        )
      } catch (error) {
        if (!request.owns(controller)) return
        const failure = asChatStreamError(error)
        if (failure.code === "ABORTED") return
        setLastError(failure)
        const content = creating
          ? getErrorMessage(
              error,
              getAppLanguage() === "en"
                ? CHAT_UNAVAILABLE_MESSAGE_EN
                : CHAT_UNAVAILABLE_MESSAGE,
            )
          : streamFailureMessage(failure, getAppLanguage())
        if (content)
          setMessages((prev) =>
            reconcileStreamedMessage(prev, replyId, {
              id: replyId,
              conversationId: activeConvId ?? -1,
              role: "assistant",
              content,
              createdAt: new Date(),
              deliveryState: "failed",
              activities: finishConsultActivity(activities, "error"),
              regenerateMessageId,
              failureRetryable: creating
                ? resolveError(error).retryable
                : failure.retryable,
            }),
          )
      } finally {
        if (request.finish(controller)) {
          setBusy(null)
          setIsTyping(false)
        }
      }
    },
    [request, recipeCards, dataCards],
  )

  const sendMessage = useCallback(
    (content: string, imageUri?: string) => runTurn(content, imageUri),
    [runTurn],
  )

  const regenerateLastMessage = useCallback(async () => {
    const question = messagesRef.current.findLast(
      (message) => message.role === "user",
    )
    if (question) await runTurn(question.content, question.imageUri, true)
  }, [runTurn])

  const stopGenerating = useCallback(() => {
    if (busy !== "sending") return
    request.cancel()
    setBusy(null)
    setIsTyping(false)
    setLastError(null)
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last?.role === "assistant")
        return prev.map((message, index) =>
          index === prev.length - 1
            ? {
                ...message,
                deliveryState: "stopped" as const,
                activities: finishConsultActivity(
                  message.activities ?? [],
                  "stopped",
                ),
              }
            : message,
        )
      return [
        ...prev,
        {
          id: optimisticMsgId--,
          conversationId: convIdRef.current ?? -1,
          role: "assistant",
          content: "",
          createdAt: new Date(),
          deliveryState: "stopped",
        },
      ]
    })
  }, [busy, request])

  const loadConversation = useCallback(
    async (targetConvId: number) => {
      if (busyRef.current === "sending") {
        setMessages((prev) =>
          prev.map((message, index) =>
            index === prev.length - 1 && message.role === "assistant"
              ? {
                  ...message,
                  deliveryState: "stopped",
                  activities: finishConsultActivity(
                    message.activities ?? [],
                    "stopped",
                  ),
                }
              : message,
          ),
        )
      }
      const controller = request.begin()
      setBusy("loading")
      setIsTyping(false)
      try {
        const { conversation, messages: loaded } =
          await chatApiService.getChatDetail(targetConvId)
        if (!request.owns(controller)) return false
        convIdRef.current = conversation.id
        setConversationId(conversation.id)
        setCategory(conversation.category ?? null)
        setMessages(loaded)
        setLastError(null)
        return true
      } catch (error) {
        if (request.owns(controller))
          presentError(error, { scope: "consult-load-conversation" })
        return false
      } finally {
        if (request.finish(controller)) setBusy(null)
      }
    },
    [request],
  )

  const resetChat = useCallback(() => {
    request.cancel()
    convIdRef.current = null
    setConversationId(null)
    setCategory(null)
    setMessages([])
    setBusy(null)
    setIsTyping(false)
    setLastError(null)
  }, [request])

  const startNewChat = useCallback(
    async (content: string) => {
      resetChat()
      await sendMessage(content)
    },
    [resetChat, sendMessage],
  )

  return {
    conversationId,
    category,
    messages,
    isTyping,
    isSending: busy === "sending",
    isLoadingConversation: busy === "loading",
    lastError,
    setCategory,
    sendMessage,
    startNewChat,
    loadConversation,
    resetChat,
    regenerateLastMessage,
    stopGenerating,
  }
}
