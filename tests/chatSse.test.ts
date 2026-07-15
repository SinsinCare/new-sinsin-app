jest.mock("../src/config/appConfig", () => ({
  getBackendUrl: () => "https://example.test",
  isMockMode: () => false,
}))

jest.mock("../src/services/core", () => ({
  api: {},
  refreshAccessToken: jest.fn(),
  tokenService: {
    getAccessToken: jest.fn(async () => "access-token"),
  },
}))

import {
  CHAT_STREAM_TIMEOUT_MS,
  createRealChatService,
} from "../src/services/data/chatApiService"
import {
  ChatStreamError,
  reconcileStreamedMessage,
  type Message,
} from "../src/types/chat"

class MockXMLHttpRequest {
  static instances: MockXMLHttpRequest[] = []

  responseText = ""
  status = 200
  timeout = 0
  onprogress: (() => void) | null = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  ontimeout: (() => void) | null = null
  onabort: (() => void) | null = null

  constructor() {
    MockXMLHttpRequest.instances.push(this)
  }

  open = jest.fn()
  setRequestHeader = jest.fn()
  send = jest.fn()

  appendResponse(chunk: string) {
    this.responseText += chunk
    this.onprogress?.()
  }

  complete(status = 200) {
    this.status = status
    this.onload?.()
  }
}

function event(name: string, payload: unknown): string {
  return `event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`
}

async function startRequest(onChunk?: (content: string) => void) {
  const service = createRealChatService()
  const promise = service.sendMessage(7, "질문", "NONE", onChunk)
  await Promise.resolve()
  await Promise.resolve()
  const xhr =
    MockXMLHttpRequest.instances[MockXMLHttpRequest.instances.length - 1]
  if (!xhr) throw new Error("XMLHttpRequest was not created")
  return { promise, xhr }
}

describe("chat SSE streaming", () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, "XMLHttpRequest", {
      configurable: true,
      writable: true,
      value: MockXMLHttpRequest,
    })
  })

  beforeEach(() => {
    MockXMLHttpRequest.instances = []
  })

  it("parses SSE events split across arbitrary response boundaries", async () => {
    const chunks: string[] = []
    const { promise, xhr } = await startRequest((content) =>
      chunks.push(content),
    )
    const stream =
      event("started", {
        attemptId: "attempt-1",
        userMessageId: 31,
        retry: false,
      }) +
      event("chunk", { content: "안녕" }) +
      event("chunk", { content: "하세요" }) +
      event("done", { messageId: 91, finishReason: "STOP" })
    const boundaries = [1, 2, 7, 3, 19, 4, 11, 5, 23, 2, 1000]
    let offset = 0

    for (const length of boundaries) {
      xhr.appendResponse(stream.slice(offset, offset + length))
      offset += length
      if (offset >= stream.length) break
    }
    if (offset < stream.length) xhr.appendResponse(stream.slice(offset))
    xhr.complete()

    await expect(promise).resolves.toMatchObject({
      id: 91,
      conversationId: 7,
      role: "assistant",
      content: "안녕하세요",
    })
    expect(chunks).toEqual(["안녕", "안녕하세요"])
  })

  it("surfaces an XMLHttpRequest timeout as a retryable structured error", async () => {
    const { promise, xhr } = await startRequest()
    const rejection = expect(promise).rejects.toMatchObject({
      name: "ChatStreamError",
      code: "TIMEOUT",
      retryable: true,
      partialContentAvailable: false,
    })

    expect(xhr.timeout).toBe(CHAT_STREAM_TIMEOUT_MS)
    xhr.ontimeout?.()
    await rejection
  })

  it("preserves partial content and MAX_TOKENS details", async () => {
    const { promise, xhr } = await startRequest()
    const rejection = expect(promise).rejects.toMatchObject({
      code: "MAX_TOKENS",
      retryable: true,
      partialContentAvailable: true,
      finishReason: "MAX_TOKENS",
      partialContent: "일부 답변",
    })

    xhr.appendResponse(
      event("chunk", { content: "일부 답변" }) +
        event("error", {
          code: "MAX_TOKENS",
          message: "maximum output tokens reached",
          retryable: true,
          partialContentAvailable: true,
          finishReason: "MAX_TOKENS",
        }),
    )
    await rejection
  })

  it("resets accumulated content when the provider starts a retry", async () => {
    const chunks: string[] = []
    const { promise, xhr } = await startRequest((content) =>
      chunks.push(content),
    )

    xhr.appendResponse(
      event("started", {
        attemptId: "attempt-1",
        userMessageId: 41,
        retry: false,
      }) + event("chunk", { content: "discard me" }),
    )
    xhr.appendResponse(
      event("started", {
        attemptId: "attempt-2",
        userMessageId: 41,
        retry: true,
      }) +
        event("chunk", { content: "final answer" }) +
        event("done", { messageId: 101, finishReason: "STOP" }),
    )
    xhr.complete()

    await expect(promise).resolves.toMatchObject({
      id: 101,
      content: "final answer",
    })
    expect(chunks).toEqual(["discard me", "", "final answer"])
  })

  it("rejects a 2xx stream that closes without done/STOP", async () => {
    const { promise, xhr } = await startRequest()
    const rejection = expect(promise).rejects.toEqual(
      expect.objectContaining<Partial<ChatStreamError>>({
        code: "INCOMPLETE_STREAM",
        retryable: true,
        partialContentAvailable: true,
        partialContent: "끊긴 답변",
      }),
    )

    xhr.appendResponse(event("chunk", { content: "끊긴 답변" }))
    xhr.complete()
    await rejection
  })

  it("surfaces provider error fields without converting them to success", async () => {
    const { promise, xhr } = await startRequest()
    const rejection = expect(promise).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      message: "provider is unavailable",
      retryable: true,
      partialContentAvailable: false,
    })

    xhr.appendResponse(
      event("error", {
        code: "PROVIDER_UNAVAILABLE",
        message: "provider is unavailable",
        retryable: true,
        partialContentAvailable: false,
      }),
    )
    await rejection
  })

  it("reconciles the placeholder to the server id without duplicates", () => {
    const now = new Date("2026-07-15T00:00:00.000Z")
    const userMessage: Message = {
      id: -1,
      conversationId: 7,
      role: "user",
      content: "질문",
      createdAt: now,
    }
    const placeholder: Message = {
      id: -2,
      conversationId: 7,
      role: "assistant",
      content: "streaming",
      createdAt: now,
    }
    const staleServerCopy: Message = {
      ...placeholder,
      id: 91,
      content: "stale",
    }
    const finalMessage: Message = {
      ...placeholder,
      id: 91,
      content: "final",
    }

    expect(
      reconcileStreamedMessage(
        [userMessage, staleServerCopy, placeholder],
        placeholder.id,
        finalMessage,
      ),
    ).toEqual([userMessage, finalMessage])
  })
})
