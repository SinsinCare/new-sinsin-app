import i18n from "../src/i18n"
import { createMockChatService } from "../src/services/data/mock/mockChatService"

describe("mock chat locale", () => {
  afterEach(async () => {
    await i18n.changeLanguage("ko")
  })

  it("presents seeded chat metadata and messages in English", async () => {
    const service = createMockChatService()
    await i18n.changeLanguage("en")

    const chats = await service.getChats()
    const detail = await service.getChatDetail(1)
    const visibleCopy = [
      ...chats.conversations.flatMap((chat) => [
        chat.title,
        chat.summary ?? "",
      ]),
      ...detail.messages.flatMap((message) => [
        message.content,
        message.aiCategoryLabel ?? "",
      ]),
    ].join(" ")

    expect(visibleCopy).not.toMatch(/[가-힣]/)
    expect(chats.conversations[0].title).toBe("Ways to cut back on sodium")
  })
})
