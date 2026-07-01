import { api } from "../src/services/core"
import {
  createDismissedAnnouncementStorage,
  DISMISSED_ANNOUNCEMENT_IDS_KEY,
} from "../src/features/announcement/storage/dismissedAnnouncements"
import { announcementService } from "../src/features/announcement/services/announcementService"
import { useAnnouncementSessionStore } from "../src/features/announcement/state/announcementSessionStore"

jest.mock("../src/services/core", () => ({
  api: {
    get: jest.fn(),
  },
}))

function createMemoryStorage(initial?: Record<string, string>) {
  const values = new Map(Object.entries(initial ?? {}))
  return {
    getItem: jest.fn((key: string) => Promise.resolve(values.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      values.set(key, value)
      return Promise.resolve()
    }),
  }
}

describe("announcement popup service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("fetches the announcement list from the /user/notices contract", async () => {
    ;(api.get as jest.Mock).mockResolvedValue({
      data: {
        result: [
          {
            id: 11,
            title: "관리자 공지",
            content: "관리자 대시보드에서 작성했습니다.",
            createdAt: "2026-07-01T10:30:00",
          },
        ],
      },
    })

    const notices = await announcementService.fetchList()

    expect(api.get).toHaveBeenCalledWith("/user/notices")
    expect(notices).toEqual([
      {
        id: 11,
        title: "관리자 공지",
        content: "관리자 대시보드에서 작성했습니다.",
        createdAt: "2026-07-01T10:30:00",
      },
    ])
  })

  it("fetches the active popup notice from the /notices contract", async () => {
    ;(api.get as jest.Mock).mockResolvedValue({
      data: {
        result: {
          id: 7,
          title: "중요 공지",
          content: "홈 진입 공지입니다.",
          createdAt: "2026-06-19T12:00:00",
          imageUrl: "https://cdn.test/notices/7/banner.jpg",
          linkUrl: "sinsin://notice/7",
          ctaLabel: "자세히 보기",
        },
      },
    })

    const notice = await announcementService.fetchActivePopup()

    expect(api.get).toHaveBeenCalledWith("/notices/active-popup")
    expect(notice).toEqual({
      id: 7,
      title: "중요 공지",
      content: "홈 진입 공지입니다.",
      createdAt: "2026-06-19T12:00:00",
      imageUrl: "https://cdn.test/notices/7/banner.jpg",
      linkUrl: "sinsin://notice/7",
      ctaLabel: "자세히 보기",
    })
  })

  it("returns null when the backend has no active popup", async () => {
    ;(api.get as jest.Mock).mockResolvedValue({ data: { result: null } })

    await expect(announcementService.fetchActivePopup()).resolves.toBeNull()
  })
})

describe("dismissed announcement storage", () => {
  it("stores dismissed ids once and preserves existing ids", async () => {
    const storage = createMemoryStorage({
      [DISMISSED_ANNOUNCEMENT_IDS_KEY]: JSON.stringify([1, 2]),
    })
    const dismissed = createDismissedAnnouncementStorage(storage)

    await dismissed.add(2)
    await dismissed.add(7)

    await expect(dismissed.getIds()).resolves.toEqual([1, 2, 7])
    expect(storage.setItem).toHaveBeenLastCalledWith(
      DISMISSED_ANNOUNCEMENT_IDS_KEY,
      JSON.stringify([1, 2, 7]),
    )
  })

  it("treats malformed storage as empty", async () => {
    const dismissed = createDismissedAnnouncementStorage(
      createMemoryStorage({ [DISMISSED_ANNOUNCEMENT_IDS_KEY]: "not-json" }),
    )

    await expect(dismissed.getIds()).resolves.toEqual([])
  })
})

describe("announcement session store", () => {
  beforeEach(() => {
    useAnnouncementSessionStore.getState().reset()
  })

  it("tracks one home-entry check per auth session and can reset on logout", () => {
    expect(useAnnouncementSessionStore.getState().checkedThisSession).toBe(
      false,
    )

    useAnnouncementSessionStore.getState().markChecked()
    expect(useAnnouncementSessionStore.getState().checkedThisSession).toBe(true)

    useAnnouncementSessionStore.getState().reset()
    expect(useAnnouncementSessionStore.getState().checkedThisSession).toBe(
      false,
    )
  })
})
