import { streamFailureMessage } from "../src/features/consultation/utils/chatFailureCopy"

describe("chat failure copy", () => {
  it("never renders an incomplete medical answer even if a legacy server sends one", () => {
    const message = streamFailureMessage({
      name: "ChatStreamError",
      code: "MAX_TOKENS",
      message: "중단됐어요",
      retryable: true,
      partialContentAvailable: true,
      partialContent: "감자 반 개는 먹어도",
      finishReason: "MAX_TOKENS",
    })

    expect(message).toContain("답변이 길어 중간에 멈췄어요")
    expect(message).not.toContain("감자 반 개")
  })
})
