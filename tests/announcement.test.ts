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
import { normalizeAnnouncementLink } from "../src/features/announcement/data/announcementLink"

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

describe("announcement CTA link", () => {
  it("keeps supported web and app links", () => {
    expect(normalizeAnnouncementLink("https://sinsincare.kr/notice?id=1")).toBe(
      "https://sinsincare.kr/notice?id=1",
    )
    expect(normalizeAnnouncementLink("sinsin://settings/announcement")).toBe(
      "sinsin://settings/announcement",
    )
  })

  it("adds https to a web host entered without a scheme", () => {
    expect(normalizeAnnouncementLink("www.sinsincare.kr/notice")).toBe(
      "https://www.sinsincare.kr/notice",
    )
    expect(normalizeAnnouncementLink("sinsincare.kr/notice")).toBe(
      "https://sinsincare.kr/notice",
    )
  })

  it("rejects empty, malformed, and unsafe links", () => {
    expect(normalizeAnnouncementLink(" ")).toBeNull()
    expect(normalizeAnnouncementLink("공지 자세히 보기")).toBeNull()
    expect(normalizeAnnouncementLink("javascript:alert(1)")).toBeNull()
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

  it("starts a new generation immediately and ignores stale request completion", async () => {
    const staleNotice = createNotice({ title: "이전 세션 공지" })
    const currentNotice = createNotice({ title: "현재 세션 공지" })
    const requestResolvers: ((notice: AnnouncementNotice | null) => void)[] = []
    const fetchActivePopup = jest.fn(
      () =>
        new Promise<AnnouncementNotice | null>((resolve) => {
          requestResolvers.push(resolve)
        }),
    )
    const { controller, showNotice } = createControllerHarness(fetchActivePopup)

    const staleCheck = controller.check()
    controller.invalidate()
    useAnnouncementSessionStore.getState().reset()
    const currentCheck = controller.check()

    expect(fetchActivePopup).toHaveBeenCalledTimes(2)

    requestResolvers[0]?.(staleNotice)
    await staleCheck

    expect(showNotice).not.toHaveBeenCalled()
    expect(useAnnouncementSessionStore.getState().checkedThisSession).toBe(
      false,
    )

    const duplicateCurrentCheck = controller.check()
    expect(fetchActivePopup).toHaveBeenCalledTimes(2)

    requestResolvers[1]?.(currentNotice)
    await Promise.all([currentCheck, duplicateCurrentCheck])

    expect(showNotice).toHaveBeenCalledTimes(1)
    expect(showNotice).toHaveBeenCalledWith(currentNotice)
    expect(useAnnouncementSessionStore.getState().checkedThisSession).toBe(true)
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

describe("announcement entry controller — 온보딩 직후 첫 홈", () => {
  function createController(overrides: Record<string, unknown> = {}) {
    const shown: unknown[] = []
    const session = { checkedThisSession: false, requestAttempts: 0 }
    const fetchActivePopup = jest.fn(() =>
      Promise.resolve({ id: 1, title: "공지", body: "본문" } as never),
    )
    const controller = createAnnouncementEntryController({
      fetchActivePopup,
      isDismissed: () => Promise.resolve(false),
      getSession: () => session,
      recordAttempt: () => {
        session.requestAttempts += 1
      },
      markChecked: () => {
        session.checkedThisSession = true
      },
      showNotice: (notice) => shown.push(notice),
      onError: () => undefined,
      ...overrides,
    })
    return { controller, shown, session, fetchActivePopup }
  }

  it("이미 체크된 세션이면 서버에 묻지도 않고 아무것도 띄우지 않는다", async () => {
    const { controller, shown, session, fetchActivePopup } = createController()
    // 온보딩 완료가 markChecked() 를 미리 세워 둔 상태를 흉내낸다.
    session.checkedThisSession = true

    await controller.check()

    expect(fetchActivePopup).not.toHaveBeenCalled()
    expect(shown).toHaveLength(0)
  })

  it("다음 세션(리셋 후)에는 정상적으로 띄운다 — 영구히 숨기는 게 아니다", async () => {
    const { controller, shown, session, fetchActivePopup } = createController()
    session.checkedThisSession = false

    await controller.check()

    expect(fetchActivePopup).toHaveBeenCalledTimes(1)
    expect(shown).toHaveLength(1)
  })
})
