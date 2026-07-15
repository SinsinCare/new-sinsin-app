import { api } from "../src/services/core"
import {
  createDismissedAnnouncementStorage,
  DISMISSED_ANNOUNCEMENT_IDS_KEY,
} from "../src/features/announcement/storage/dismissedAnnouncements"
import { announcementService } from "../src/features/announcement/services/announcementService"
import { useAnnouncementSessionStore } from "../src/features/announcement/state/announcementSessionStore"
import {
  createAnnouncementEntryController,
  MAX_ANNOUNCEMENT_CHECK_ATTEMPTS,
} from "../src/features/announcement/hooks/announcementEntryController"
import type { AnnouncementNotice } from "../src/features/announcement/types"

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

function createNotice(
  overrides: Partial<AnnouncementNotice> = {},
): AnnouncementNotice {
  return {
    id: 7,
    title: "중요 공지",
    content: "홈 진입 공지입니다.",
    createdAt: "2026-06-19T12:00:00",
    updatedAt: "2026-07-15T10:00:00",
    ...overrides,
  }
}

function createControllerHarness(
  fetchActivePopup: jest.Mock<Promise<AnnouncementNotice | null>, []>,
  isDismissed: (notice: AnnouncementNotice) => Promise<boolean> = async () =>
    false,
) {
  const showNotice = jest.fn()
  const onError = jest.fn()
  const controller = createAnnouncementEntryController({
    fetchActivePopup,
    isDismissed,
    getSession: () => useAnnouncementSessionStore.getState(),
    recordAttempt: () => useAnnouncementSessionStore.getState().recordAttempt(),
    markChecked: () => useAnnouncementSessionStore.getState().markChecked(),
    showNotice,
    onError,
  })
  return { controller, showNotice, onError }
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
            updatedAt: "2026-07-14T09:20:00",
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
        updatedAt: "2026-07-14T09:20:00",
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
          updatedAt: "2026-07-15T10:00:00",
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
      updatedAt: "2026-07-15T10:00:00",
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
  it("does not let old dismissed-id payloads suppress a revisioned notice", async () => {
    const storage = createMemoryStorage({
      [DISMISSED_ANNOUNCEMENT_IDS_KEY]: JSON.stringify([1, 2]),
    })
    const dismissed = createDismissedAnnouncementStorage(storage)
    const notice = createNotice({ id: 2 })

    await expect(dismissed.has(notice)).resolves.toBe(false)

    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it("keeps old dismissed-id payloads compatible with old server notices", async () => {
    const dismissed = createDismissedAnnouncementStorage(
      createMemoryStorage({
        [DISMISSED_ANNOUNCEMENT_IDS_KEY]: JSON.stringify([7]),
      }),
    )
    const oldPayload = createNotice({ updatedAt: undefined })

    await expect(dismissed.has(oldPayload)).resolves.toBe(true)
  })

  it("matches the dismissed version but allows an edited notice", async () => {
    const storage = createMemoryStorage()
    const dismissed = createDismissedAnnouncementStorage(storage)
    const original = createNotice()
    const edited = createNotice({ updatedAt: "2026-07-15T11:00:00" })

    await dismissed.add(original)

    await expect(dismissed.has(original)).resolves.toBe(true)
    await expect(dismissed.has(edited)).resolves.toBe(false)
  })

  it("falls back to createdAt for old server payloads", async () => {
    const storage = createMemoryStorage()
    const dismissed = createDismissedAnnouncementStorage(storage)
    const oldPayload = createNotice({ updatedAt: undefined })

    await dismissed.add(oldPayload)

    await expect(dismissed.has(oldPayload)).resolves.toBe(true)
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

  it("tracks attempts and completion per auth session and resets on logout", () => {
    expect(useAnnouncementSessionStore.getState().checkedThisSession).toBe(
      false,
    )
    expect(useAnnouncementSessionStore.getState().requestAttempts).toBe(0)

    useAnnouncementSessionStore.getState().recordAttempt()
    useAnnouncementSessionStore.getState().markChecked()
    expect(useAnnouncementSessionStore.getState().checkedThisSession).toBe(true)
    expect(useAnnouncementSessionStore.getState().requestAttempts).toBe(1)

    useAnnouncementSessionStore.getState().reset()
    expect(useAnnouncementSessionStore.getState().checkedThisSession).toBe(
      false,
    )
    expect(useAnnouncementSessionStore.getState().requestAttempts).toBe(0)
  })
})

describe("announcement entry controller", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAnnouncementSessionStore.getState().reset()
  })

  it("shows a new eligible notice once", async () => {
    const notice = createNotice()
    const fetchActivePopup = jest.fn().mockResolvedValue(notice)
    const { controller, showNotice } = createControllerHarness(fetchActivePopup)

    await controller.check()

    expect(showNotice).toHaveBeenCalledTimes(1)
    expect(showNotice).toHaveBeenCalledWith(notice)
    expect(useAnnouncementSessionStore.getState().checkedThisSession).toBe(true)
  })

  it("does not show a dismissed notice at the same revision", async () => {
    const notice = createNotice()
    const dismissed = createDismissedAnnouncementStorage(createMemoryStorage())
    await dismissed.add(notice)
    const { controller, showNotice } = createControllerHarness(
      jest.fn().mockResolvedValue(notice),
      (candidate) => dismissed.has(candidate),
    )

    await controller.check()

    expect(showNotice).not.toHaveBeenCalled()
    expect(useAnnouncementSessionStore.getState().checkedThisSession).toBe(true)
  })

  it("shows an edited revision after the prior version was dismissed", async () => {
    const original = createNotice()
    const edited = createNotice({ updatedAt: "2026-07-15T11:00:00" })
    const dismissed = createDismissedAnnouncementStorage(createMemoryStorage())
    await dismissed.add(original)
    const { controller, showNotice } = createControllerHarness(
      jest.fn().mockResolvedValue(edited),
      (candidate) => dismissed.has(candidate),
    )

    await controller.check()

    expect(showNotice).toHaveBeenCalledWith(edited)
  })

  it("recovers on a foreground or focus retry after the initial request fails", async () => {
    const notice = createNotice()
    const fetchActivePopup = jest
      .fn()
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce(notice)
    const { controller, showNotice, onError } =
      createControllerHarness(fetchActivePopup)

    await controller.check()

    expect(onError).toHaveBeenCalledTimes(1)
    expect(useAnnouncementSessionStore.getState().checkedThisSession).toBe(
      false,
    )
    expect(useAnnouncementSessionStore.getState().requestAttempts).toBe(1)

    await controller.check()

    expect(fetchActivePopup).toHaveBeenCalledTimes(2)
    expect(showNotice).toHaveBeenCalledWith(notice)
    expect(useAnnouncementSessionStore.getState().checkedThisSession).toBe(true)
  })

  it("marks a no-notice response complete and skips later foreground checks", async () => {
    const fetchActivePopup = jest.fn().mockResolvedValue(null)
    const { controller, showNotice } = createControllerHarness(fetchActivePopup)

    await controller.check()
    await controller.check()

    expect(fetchActivePopup).toHaveBeenCalledTimes(1)
    expect(showNotice).not.toHaveBeenCalled()
    expect(useAnnouncementSessionStore.getState().checkedThisSession).toBe(true)
  })

  it("deduplicates concurrent foreground checks and never spams the popup", async () => {
    const notice = createNotice()
    let resolveRequest: ((notice: AnnouncementNotice) => void) | undefined
    const fetchActivePopup = jest.fn(
      () =>
        new Promise<AnnouncementNotice>((resolve) => {
          resolveRequest = resolve
        }),
    )
    const { controller, showNotice } = createControllerHarness(fetchActivePopup)

    const checks = [controller.check(), controller.check(), controller.check()]
    expect(fetchActivePopup).toHaveBeenCalledTimes(1)
    resolveRequest?.(notice)
    await Promise.all(checks)
    await controller.check()

    expect(fetchActivePopup).toHaveBeenCalledTimes(1)
    expect(showNotice).toHaveBeenCalledTimes(1)
  })

  it("bounds retries after repeated request failures", async () => {
    const fetchActivePopup = jest.fn().mockRejectedValue(new Error("offline"))
    const { controller } = createControllerHarness(fetchActivePopup)

    for (
      let attempt = 0;
      attempt < MAX_ANNOUNCEMENT_CHECK_ATTEMPTS + 2;
      attempt += 1
    ) {
      await controller.check()
    }

    expect(fetchActivePopup).toHaveBeenCalledTimes(
      MAX_ANNOUNCEMENT_CHECK_ATTEMPTS,
    )
    expect(useAnnouncementSessionStore.getState().checkedThisSession).toBe(
      false,
    )
  })
})
