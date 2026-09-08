import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useChat } from "../src/features/consultation/hooks/useChat"
import {
  chatMessageKey,
  ChatStreamError,
  type Message,
} from "../src/types/chat"
import { chatApiService } from "@/src/services"

jest.mock("react", () => require("./helpers/effectHookHarness"))
jest.mock("@/src/services", () => ({
  chatApiService: {
    createChat: jest.fn(),
    sendMessage: jest.fn(),
    getChatDetail: jest.fn(),
  },
}))
jest.mock("@/src/lib/errorMessage", () => ({
  presentError: jest.fn(),
  resolveError: () => ({ retryable: true }),
}))
jest.mock("@/src/lib/errorUtils", () => ({
  getErrorMessage: (_error: unknown, fallback: string) => fallback,
}))
jest.mock("@/src/i18n", () => ({ getAppLanguage: () => "ko" }))
const api = chatApiService as jest.Mocked<typeof chatApiService>
const date = new Date("2026-09-06T00:00:00Z")
function message(
  id: number,
  content: string,
  role: Message["role"] = "assistant",
): Message {
  return { id, conversationId: 1, role, content, createdAt: date }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}
beforeEach(() => {
  jest.clearAllMocks()
  api.createChat.mockResolvedValue({
    conversation: {
      id: 1,
      title: "Test",
      category: "NONE",
      status: "ACTIVE",
      createdAt: date,
      updatedAt: date,
    },
  } as never)
})

describe("consultation request lifecycle", () => {
  it.each([false, true])(
    "preserves the server answer ID and recipe capability %s when regeneration is stopped and retried",
    async (recipeCards) => {
      const h = renderHookWithEffects(() =>
        useChat({ recipeCards, dataCards: recipeCards }),
      )
      api.sendMessage.mockResolvedValueOnce(message(12, "원래 답변"))
      await h.result().sendMessage("질문")
      const pending = deferred<Message>()
      api.sendMessage.mockReturnValueOnce(pending.promise)
      const regeneration = h.result().regenerateLastMessage()
      await flush()
      expect(api.sendMessage.mock.calls.at(-1)?.[7]).toEqual({
        regenerateMessageId: 12,
        ...(recipeCards ? { recipeCards: true, dataCards: true } : {}),
      })
      h.result().stopGenerating()
      api.sendMessage.mockResolvedValueOnce(message(12, "새 답변"))
      await h.result().regenerateLastMessage()
      expect(api.sendMessage.mock.calls.at(-1)?.[7]).toEqual({
        regenerateMessageId: 12,
        ...(recipeCards ? { recipeCards: true, dataCards: true } : {}),
      })
      pending.resolve(message(12, "중단된 답변"))
      await regeneration
      expect(h.result().messages.map((row) => row.content)).toEqual([
        "질문",
        "새 답변",
      ])
      h.unmount()
    },
  )
  it("keeps activity with its answer and terminates active rows on stop without accepting late activity", async () => {
    const reply = deferred<Message>()
    let onActivity!: NonNullable<Parameters<typeof api.sendMessage>[6]>
    api.sendMessage.mockImplementation(
      (_id, _text, _category, _onChunk, _image, _signal, activity) => {
        onActivity = activity!
        return reply.promise
      },
    )
    const h = renderHookWithEffects(useChat)
    const turn = h.result().sendMessage("레시피 검색")
    await flush()
    onActivity({ id: "t1", action: "recipes", status: "running" })
    expect(h.result().messages.at(-1)?.activities).toHaveLength(1)
    h.result().stopGenerating()
    onActivity({ id: "t1", action: "recipes", status: "complete" })
    reply.resolve(message(31, "late"))
    await turn
    expect(h.result().messages.at(-1)?.activities?.[0].status).toBe("stopped")
    expect(h.result().messages.at(-1)?.content).toBe("")
    h.unmount()
  })
  it("keeps the open answer identity from tool activity through final server assignment", async () => {
    const pending = deferred<Message>()
    let activity!: NonNullable<Parameters<typeof api.sendMessage>[6]>
    api.sendMessage.mockImplementation(
      (_id, _text, _category, _chunk, _image, _signal, onActivity) => {
        activity = onActivity!
        return pending.promise
      },
    )
    const h = renderHookWithEffects(useChat)
    const sending = h.result().sendMessage("두부 레시피")
    await flush()
    const before = chatMessageKey(h.result().messages.at(-1)!)
    activity({
      id: "read_1",
      action: "recipe",
      status: "complete",
      sources: [{ type: "recipe", id: 45, title: "두부 채소찜" }],
    })
    expect(chatMessageKey(h.result().messages.at(-1)!)).toBe(before)
    pending.resolve(message(345, "완료"))
    await sending
    expect(h.result().messages.at(-1)?.id).toBe(345)
    expect(chatMessageKey(h.result().messages.at(-1)!)).toBe(before)
    expect(h.result().messages.at(-1)?.activities?.[0]?.sources?.[0]?.id).toBe(
      45,
    )
    h.unmount()
  })
  it("reconciles chunks and completion into one reply", async () => {
    api.sendMessage.mockImplementation(
      async (_id, _content, _category, onChunk) => {
        onChunk?.("첫 문장")
        onChunk?.("첫 문장과 다음 문장")
        return message(12, "완성 답변")
      },
    )
    const h = renderHookWithEffects(useChat)
    await h.result().sendMessage("질문")
    expect(h.result().messages.map((m) => m.content)).toEqual([
      "질문",
      "완성 답변",
    ])
    expect(h.result().isSending).toBe(false)
    h.unmount()
  })
  it("blocks double send before conversation creation completes", async () => {
    const create = deferred<any>()
    api.createChat.mockReturnValue(create.promise)
    api.sendMessage.mockResolvedValue(message(12, "답변"))
    const h = renderHookWithEffects(useChat)
    const first = h.result().sendMessage("하나")
    await h.result().sendMessage("둘")
    expect(api.createChat).toHaveBeenCalledTimes(1)
    create.resolve({ conversation: { id: 1 } })
    await first
    expect(h.result().messages.filter((m) => m.role === "user")).toHaveLength(1)
    h.unmount()
  })
  it("stop during creation permits a new request and rejects the late creation", async () => {
    const old = deferred<any>()
    api.createChat.mockReturnValueOnce(old.promise)
    api.sendMessage.mockResolvedValue(message(20, "새 답변"))
    const h = renderHookWithEffects(useChat)
    const first = h.result().sendMessage("첫 질문")
    h.result().stopGenerating()
    expect(h.result().isSending).toBe(false)
    expect(h.result().messages.at(-1)?.deliveryState).toBe("stopped")
    await h.result().sendMessage("두 번째 질문")
    old.resolve({ conversation: { id: 99 } })
    await first
    expect(api.sendMessage).toHaveBeenCalledTimes(1)
    expect(h.result().conversationId).toBe(1)
    expect(h.result().messages.at(-1)?.content).toBe("새 답변")
    h.unmount()
  })
  it("late chunks and settlement cannot alter a replacement stream", async () => {
    const old = deferred<Message>()
    const next = deferred<Message>()
    let chunk!: (text: string) => void
    api.sendMessage
      .mockImplementationOnce((_id, _content, _category, onChunk) => {
        chunk = onChunk!
        return old.promise
      })
      .mockReturnValueOnce(next.promise)
    const h = renderHookWithEffects(useChat)
    const first = h.result().sendMessage("첫 질문")
    await flush()
    chunk("부분 답변")
    h.result().stopGenerating()
    const second = h.result().sendMessage("다음 질문")
    await flush()
    chunk("오래된 답변")
    old.resolve(message(19, "오래된 완료"))
    await first
    expect(h.result().isSending).toBe(true)
    expect(h.result().messages.some((m) => m.content.includes("오래된"))).toBe(
      false,
    )
    expect(
      h.result().messages.find((m) => m.content === "부분 답변")?.deliveryState,
    ).toBe("stopped")
    next.resolve(message(20, "새 완료"))
    await second
    h.unmount()
  })
  it("a failed creation from a reset chat cannot append an error", async () => {
    const old = deferred<any>()
    api.createChat.mockReturnValueOnce(old.promise)
    const h = renderHookWithEffects(useChat)
    const first = h.result().sendMessage("질문")
    h.result().resetChat()
    old.reject(new Error("late"))
    await first
    expect(h.result().messages).toEqual([])
    expect(h.result().isTyping).toBe(false)
    h.unmount()
  })
  it("retries a creation failure without duplicating its question", async () => {
    api.createChat.mockRejectedValueOnce(new Error("offline"))
    api.sendMessage.mockResolvedValue(message(12, "복구"))
    const h = renderHookWithEffects(useChat)
    await h.result().sendMessage("그 질문")
    expect(h.result().messages.at(-1)?.deliveryState).toBe("failed")
    await h.result().regenerateLastMessage()
    expect(h.result().messages.map((m) => m.content)).toEqual([
      "그 질문",
      "복구",
    ])
    h.unmount()
  })
  it("latest requested history wins when responses arrive out of order", async () => {
    const first = deferred<any>()
    const second = deferred<any>()
    api.getChatDetail
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const h = renderHookWithEffects(useChat)
    const a = h.result().loadConversation(1)
    const b = h.result().loadConversation(2)
    second.resolve({
      conversation: { id: 2, category: "EXAM" },
      messages: [message(22, "두 번째 상담")],
    })
    await b
    first.resolve({
      conversation: { id: 1 },
      messages: [message(11, "이전 상담")],
    })
    expect(await a).toBe(false)
    expect(h.result().conversationId).toBe(2)
    expect(h.result().category).toBe("EXAM")
    h.unmount()
  })
  it("a history failure preserves the current conversation", async () => {
    api.sendMessage.mockResolvedValue(message(12, "현재 답변"))
    api.getChatDetail.mockRejectedValue(new Error("offline"))
    const h = renderHookWithEffects(useChat)
    await h.result().sendMessage("현재 질문")
    expect(await h.result().loadConversation(2)).toBe(false)
    expect(h.result().messages.at(-1)?.content).toBe("현재 답변")
    expect(h.result().isLoadingConversation).toBe(false)
    h.unmount()
  })
  it("marks the interrupted answer stopped when loading history fails", async () => {
    const pending = deferred<Message>()
    api.sendMessage.mockImplementation(
      (_id, _text, _category, chunk, _image, _signal, activity) => {
        chunk?.("확인 중인 답변")
        activity?.({ id: "tool-1", action: "recipes", status: "running" })
        return pending.promise
      },
    )
    api.getChatDetail.mockRejectedValue(new Error("offline"))
    const h = renderHookWithEffects(useChat)
    const turn = h.result().sendMessage("레시피")
    await flush()
    expect(await h.result().loadConversation(2)).toBe(false)
    expect(h.result().messages.at(-1)).toMatchObject({
      content: "확인 중인 답변",
      deliveryState: "stopped",
      activities: [{ id: "tool-1", action: "recipes", status: "stopped" }],
    })
    pending.resolve(message(9, "늦은 결과"))
    await turn
    expect(h.result().messages.at(-1)?.content).toBe("확인 중인 답변")
    h.unmount()
  })
  it("uses the error retry contract and replaces partial text on failure", async () => {
    api.sendMessage.mockImplementation(
      async (_id, _content, _category, chunk) => {
        chunk?.("불완전한 답변")
        throw new ChatStreamError({
          code: "TIMEOUT",
          message: "wire detail",
          retryable: true,
          partialContentAvailable: true,
        })
      },
    )
    const h = renderHookWithEffects(useChat)
    await h.result().sendMessage("질문")
    expect(h.result().messages).toHaveLength(2)
    expect(h.result().messages.at(-1)).toMatchObject({
      deliveryState: "failed",
      failureRetryable: true,
    })
    expect(h.result().messages.at(-1)?.content).not.toContain("wire detail")
    h.unmount()
  })
  it("unmount aborts the stream and ignores a late completion", async () => {
    const reply = deferred<Message>()
    let signal: AbortSignal | undefined
    api.sendMessage.mockImplementation(
      (_id, _content, _category, _chunk, _image, s) => {
        signal = s
        return reply.promise
      },
    )
    const h = renderHookWithEffects(useChat)
    const turn = h.result().sendMessage("질문")
    await flush()
    h.unmount()
    expect(signal?.aborted).toBe(true)
    reply.resolve(message(20, "late"))
    await turn
    expect(h.result().messages.map((m) => m.content)).toEqual(["질문", ""])
  })
})
