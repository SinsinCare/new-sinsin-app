import {
  dropAnswersAfterLastUser,
  dropLastTurn,
  type Message,
} from "../src/types/chat"

function message(
  id: number,
  role: Message["role"],
  content = `msg-${id}`,
): Message {
  return {
    id,
    conversationId: 1,
    role,
    content,
    createdAt: new Date("2026-07-30T00:00:00Z"),
  }
}

describe("답변 다시 받기 정리", () => {
  it("실패 폴백이 새 답변과 나란히 남지 않는다", () => {
    const messages = [
      message(1, "user", "케일"),
      message(-2, "assistant", "지금은 답변을 받을 수 없어요."),
    ]

    expect(dropAnswersAfterLastUser(messages)).toEqual([messages[0]])
  })

  it("중복 재생성으로 쌓인 답변도 한 번에 걷는다", () => {
    const messages = [
      message(1, "user", "케일"),
      message(-2, "assistant", "지금은 답변을 받을 수 없어요."),
      message(3, "assistant", "케일은 칼륨이 꽤 많은 편에 속하는 채소라"),
    ]

    expect(dropAnswersAfterLastUser(messages)).toEqual([messages[0]])
  })

  it("이전 턴의 질문과 답변은 건드리지 않는다", () => {
    const messages = [
      message(1, "user", "감자"),
      message(2, "assistant", "감자는"),
      message(3, "user", "케일"),
      message(-4, "assistant", "지금은 답변을 받을 수 없어요."),
    ]

    expect(dropAnswersAfterLastUser(messages)).toEqual(messages.slice(0, 3))
  })

  it("걷어낼 답변이 없으면 같은 배열을 그대로 돌려준다", () => {
    const messages = [message(1, "user", "케일")]

    expect(dropAnswersAfterLastUser(messages)).toBe(messages)
  })

  it("질문이 없으면 아무것도 걷지 않는다", () => {
    const messages = [message(1, "assistant", "무엇이 궁금하세요?")]

    expect(dropAnswersAfterLastUser(messages)).toBe(messages)
  })

  it("대화 생성부터 실패한 턴은 질문까지 걷어 처음부터 다시 보낸다", () => {
    const messages = [
      message(1, "user", "감자"),
      message(2, "assistant", "감자는"),
      message(3, "user", "케일"),
      message(-4, "assistant", "지금은 답변을 받을 수 없어요."),
    ]

    expect(dropLastTurn(messages)).toEqual(messages.slice(0, 2))
  })
})
