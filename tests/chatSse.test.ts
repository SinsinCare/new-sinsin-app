import {
  CHAT_STREAM_MAX_CONTENT_CHARS,
  CHAT_STREAM_MAX_FRAME_CHARS,
  CHAT_STREAM_MAX_WIRE_CHARS,
  CHAT_STREAM_TIMEOUT_MS,
  createRealChatService,
  chatApiService,
} from "../src/services/data/chatApiService"
import { getAppLanguage } from "../src/i18n"
import {
  ChatStreamError,
  reconcileStreamedMessage,
  type Message,
} from "../src/types/chat"

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

jest.mock("../src/i18n", () => ({
  getAppLanguage: jest.fn(() => "ko"),
}))

jest.mock("../src/shared/utils/preparedImageUpload", () => ({
  prepareImageUpload: jest.fn(async (uri: string) => ({
    uri,
    cleanup: jest.fn(async () => undefined),
  })),
}))

const mockGetAppLanguage = getAppLanguage as jest.MockedFunction<
  typeof getAppLanguage
>

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
  abort = jest.fn(() => this.onabort?.())

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

async function startAbortableRequest(signal: AbortSignal) {
  const service = createRealChatService()
  const promise = service.sendMessage(
    7,
    "질문",
    "NONE",
    undefined,
    undefined,
    signal,
  )
  await Promise.resolve()
  await Promise.resolve()
  const xhr =
    MockXMLHttpRequest.instances[MockXMLHttpRequest.instances.length - 1]
  if (!xhr) throw new Error("XMLHttpRequest was not created")
  return { promise, xhr }
}

describe("chat SSE streaming", () => {
  it("opts capable clients in and preserves exact recipe cards across partial SSE frames", async () => {
    const onActivity = jest.fn()
    const promise = createRealChatService().sendMessage(
      7,
      "오늘저녁레시피",
      "NONE",
      undefined,
      undefined,
      undefined,
      onActivity,
      { recipeCards: true },
    )
    await Promise.resolve()
    await Promise.resolve()
    const xhr = MockXMLHttpRequest.instances.at(-1)!
    expect(xhr.setRequestHeader).toHaveBeenCalledWith(
      "X-Consult-Recipe-Cards",
      "1",
    )
    const recipe = {
      version: 1,
      timeMin: 35,
      servings: 1,
      ingredients: [{ name: "당면(건조)", amount: "60g" }],
      steps: ["당면을 삶아요."],
    }
    const receipt = {
      id: "recipe-1",
      action: "recipe",
      status: "complete",
      sources: [{ type: "recipe", id: 45, title: "잡채덮밥 (저염)", recipe }],
    }
    const wire = event("activity", receipt)
    const split = wire.indexOf("60g") + 1
    xhr.appendResponse(wire.slice(0, split))
    expect(onActivity).not.toHaveBeenCalled()
    xhr.appendResponse(wire.slice(split))
    expect(onActivity).toHaveBeenCalledWith(receipt)
    xhr.appendResponse(
      event("chunk", { content: "오늘은 이 레시피를 추천해요." }),
    )
    xhr.appendResponse(
      event("done", {
        messageId: 22,
        finishReason: "STOP",
        activities: [receipt],
      }),
    )
    xhr.complete()
    await expect(promise).resolves.toMatchObject({ activities: [receipt] })

    const legacy = await startRequest()
    expect(legacy.xhr.setRequestHeader).not.toHaveBeenCalledWith(
      "X-Consult-Recipe-Cards",
      "1",
    )
    legacy.xhr.appendResponse(
      event("chunk", { content: "기존 답변" }) +
        event("done", { messageId: 23, finishReason: "STOP" }),
    )
    legacy.xhr.complete()
    await expect(legacy.promise).resolves.toMatchObject({
      content: "기존 답변",
    })
  })
  it("opts data cards in and preserves a missing-intake snapshot through SSE and completion", async () => {
    const onActivity = jest.fn()
    const promise = createRealChatService().sendMessage(
      7,
      "오늘 섭취량",
      "NONE",
      undefined,
      undefined,
      undefined,
      onActivity,
      { dataCards: true },
    )
    await Promise.resolve()
    await Promise.resolve()
    const xhr = MockXMLHttpRequest.instances.at(-1)!
    expect(xhr.setRequestHeader).toHaveBeenCalledWith(
      "X-Consult-Data-Cards",
      "1",
    )
    const nutrition = {
      version: 1,
      kind: "intake",
      date: "2026-09-06",
      asOf: "2026-09-06T01:00:00.000Z",
      recorded: false,
      proteinBasisKg: null,
      rows: ["sodium", "potassium", "phosphorus", "protein", "water"].map(
        (nutrient) => ({
          nutrient,
          unit:
            nutrient === "protein" ? "g" : nutrient === "water" ? "mL" : "mg",
          target: null,
          consumed: null,
        }),
      ),
    }
    const activity = {
      id: "intake",
      action: "intake",
      status: "complete",
      outcome: "empty",
      nutrition,
    }
    xhr.appendResponse(event("activity", { ...activity, profile: "PRIVATE" }))
    expect(onActivity).toHaveBeenCalledWith(activity)
    xhr.appendResponse(
      event("chunk", { content: "기록이 없어요." }) +
        event("done", {
          messageId: 24,
          finishReason: "STOP",
          activities: [activity],
        }),
    )
    xhr.complete()
    await expect(promise).resolves.toMatchObject({ activities: [activity] })
  })
  it("routes bounded activity separately from answer text and ignores unrecognized internal fields", async () => {
    const onActivity = jest.fn()
    const onChunk = jest.fn()
    const promise = chatApiService.sendMessage(
      7,
      "질문",
      "NONE",
      onChunk,
      undefined,
      undefined,
      onActivity,
    )
    await Promise.resolve()
    await Promise.resolve()
    const xhr = MockXMLHttpRequest.instances.at(-1)!
    xhr.appendResponse(
      event("activity", {
        id: "tool-1",
        action: "recipes",
        status: "running",
        reasoning: "PRIVATE",
      }),
    )
    xhr.appendResponse(
      event("activity", {
        id: "invalid",
        action: "raw_reasoning",
        status: "complete",
      }),
    )
    xhr.appendResponse(
      event("chunk", { content: "완성 문장." }) +
        event("done", {
          messageId: 22,
          finishReason: "STOP",
          activities: [
            {
              id: "tool-1",
              action: "recipes",
              status: "complete",
              resultCount: 4,
              reasoning: "PRIVATE",
            },
          ],
        }),
    )
    xhr.complete()
    expect(onActivity.mock.calls).toEqual([
      [{ id: "tool-1", action: "recipes", status: "running" }],
    ])
    expect(onChunk).toHaveBeenCalledWith("완성 문장.")
    await expect(promise).resolves.toMatchObject({
      content: "완성 문장.",
      activities: [
        { id: "tool-1", action: "recipes", status: "complete", resultCount: 4 },
      ],
    })
  })
  beforeAll(() => {
    Object.defineProperty(globalThis, "XMLHttpRequest", {
      configurable: true,
      writable: true,
      value: MockXMLHttpRequest,
    })
  })

  beforeEach(() => {
    MockXMLHttpRequest.instances = []
    mockGetAppLanguage.mockReturnValue("ko")
  })

  it("reads the current app language when each message request begins", async () => {
    mockGetAppLanguage.mockReturnValue("en")
    const first = await startRequest()
    expect(first.xhr.setRequestHeader).toHaveBeenCalledWith(
      "Accept-Language",
      "en-US",
    )
    first.xhr.appendResponse(
      event("chunk", { content: "English reply" }) +
        event("done", { messageId: 201, finishReason: "STOP" }),
    )
    first.xhr.complete()
    await expect(first.promise).resolves.toMatchObject({
      content: "English reply",
    })

    mockGetAppLanguage.mockReturnValue("ko")
    const second = await startRequest()
    expect(second.xhr.setRequestHeader).toHaveBeenCalledWith(
      "Accept-Language",
      "ko-KR",
    )
    second.xhr.appendResponse(
      event("chunk", { content: "한국어 답변" }) +
        event("done", { messageId: 202, finishReason: "STOP" }),
    )
    second.xhr.complete()
    await expect(second.promise).resolves.toMatchObject({
      content: "한국어 답변",
    })
  })

  it("parses SSE events split across arbitrary response boundaries", async () => {
    const chunks: string[] = []
    const serverCreatedAt = "2026-07-15T10:20:30.456Z"
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
      event("done", {
        messageId: 91,
        finishReason: "STOP",
        category: "FOOD_DIET",
        categoryLabel: "음식·식단",
        role: "ASSISTANT",
        createdAt: serverCreatedAt,
      })
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
      aiCategory: "FOOD_DIET",
      aiCategoryLabel: "음식·식단",
      createdAt: new Date(serverCreatedAt),
    })
    expect(chunks).toEqual(["안녕", "안녕하세요"])
  })

  it.each(["\n", "\r", "\r\n"])(
    "preserves long frames and every delimiter boundary for %j line endings",
    async (newline) => {
      const { promise, xhr } = await startRequest()
      const content = "한글😀".repeat(6000)
      const wire = (
        event("chunk", { content }) +
        event("done", {
          messageId: 92,
          finishReason: "STOP",
          role: "ASSISTANT",
        })
      ).replace(/\n/g, newline)
      // Single-character reads include every CRLF and UTF-16 boundary.
      for (const char of wire.split("")) xhr.appendResponse(char)
      xhr.complete()
      await expect(promise).resolves.toMatchObject({ id: 92, content })
    },
  )

  it("rejects an oversized complete frame, including a same-read delimiter", async () => {
    const { promise, xhr } = await startRequest()
    const rejected = expect(promise).rejects.toMatchObject({
      code: "STREAM_TOO_LARGE",
    })
    xhr.appendResponse(`data: ${"x".repeat(CHAT_STREAM_MAX_FRAME_CHARS)}\n\n`)
    await rejected
    expect(xhr.abort).toHaveBeenCalled()
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

  it("aborts the native request when the caller signal is cancelled", async () => {
    const controller = new AbortController()
    const { promise, xhr } = await startAbortableRequest(controller.signal)
    const rejection = expect(promise).rejects.toMatchObject({
      code: "ABORTED",
      partialContentAvailable: false,
    })

    controller.abort()

    expect(xhr.abort).toHaveBeenCalledTimes(1)
    await rejection
  })

  it("aborts a delimiter-free SSE frame above the parser limit", async () => {
    const { promise, xhr } = await startRequest()
    const rejection = expect(promise).rejects.toMatchObject({
      code: "STREAM_TOO_LARGE",
      retryable: false,
    })

    xhr.appendResponse("x".repeat(CHAT_STREAM_MAX_FRAME_CHARS + 1))

    expect(xhr.abort).toHaveBeenCalledTimes(1)
    await rejection
  })

  it("aborts accumulated assistant content above the output limit", async () => {
    const { promise, xhr } = await startRequest()
    const rejection = expect(promise).rejects.toMatchObject({
      code: "STREAM_TOO_LARGE",
      retryable: false,
    })

    xhr.appendResponse(
      event("chunk", {
        content: "가".repeat(CHAT_STREAM_MAX_CONTENT_CHARS + 1),
      }),
    )

    expect(xhr.abort).toHaveBeenCalledTimes(1)
    await rejection
  })

  it("aborts total SSE wire data above the request limit", async () => {
    const { promise, xhr } = await startRequest()
    const rejection = expect(promise).rejects.toMatchObject({
      code: "STREAM_TOO_LARGE",
      retryable: false,
    })

    xhr.appendResponse(
      ":\n\n".repeat(Math.ceil(CHAT_STREAM_MAX_WIRE_CHARS / 3) + 1),
    )

    expect(xhr.abort).toHaveBeenCalledTimes(1)
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
    ).toEqual([userMessage, { ...finalMessage, clientKey: "message-7--2" }])
  })
})
