/**
 * **어느 캐시까지 다시 받는가** — 스토리 좋아요(R1)와 차단(R2).
 *
 * ── R1. 좋아요가 페이저를 다시 섞었다 ──────────────────────────────────────
 * `toggleLike` 의 정산이 `invalidateQueries({queryKey: STORIES_KEY})` 였다. 기본
 * `refetchType` 은 `"active"` 라 **화면에 붙어 있는 목록을 즉시 다시 받는다.** 추천
 * 정렬은 서버가 `ORDER BY random()` 으로 매번 새로 섞으므로, 하트를 누른 사람은
 * 손가락 아래에서 스토리가 통째로 바뀌는 것을 본다. 확정 상태는 낙관 갱신이 이미
 * 반영했으니 **낡음 표시만** 하면 된다(피드 계보 `invalidateFeedCaches` 와 같은 규칙).
 *
 * ── R2. 차단이 스토리·댓글에 닿지 않았다 ───────────────────────────────────
 * `invalidateFeedCaches` 가 훑는 뿌리는 글 목록·검색·인기 셋뿐이다. 그래서 차단한
 * 직후에도 그 사람의 스토리는 전체화면 앞에 그대로 있고, 레일에 타일이 남고, 열려
 * 있던 글 상세에는 그 사람 댓글이 남았다 — 글만 사라진 화면은 "차단이 반쯤 먹었다"
 * 로 읽힌다. 서버는 이미 거르고 있었고(스토리 목록 서비스), 앱이 다시 안 받았을 뿐이다.
 *
 * 반대 방향도 같이 못 박는다: 스토리·댓글을 `FEED_CACHE_ROOTS` 에 **넣지 않는다.**
 * 그 목록은 좋아요·북마크·조회수의 취소·패치·정산이 전부 도는 뿌리라, 넣는 순간
 * 하트 한 번에 스토리(매번 새로 섞여 오는 목록)와 댓글까지 딸려 다닌다.
 *
 * ## 어떻게 재는가
 *
 * 변이는 **실물 훅**을 `react-dom/server` 로 한 번 렌더해 붙잡는다
 * (`communityWriteSafety.test.ts` 와 같은 처방). 다만 SSR 렌더는 옵저버를 **구독하지
 * 않으므로**, "화면에 붙어 있는 목록" 역할은 실물 `QueryObserver` 를 따로 구독해
 * 세운다 — 무효화가 실제로 재조회를 부르는지는 그 옵저버로만 잴 수 있다.
 */
/* eslint-disable import/first */
jest.mock("../src/features/recipe/services/communityStoryService", () => ({
  communityStoryService: {
    getStories: jest.fn(),
    toggleLike: jest.fn(),
    createStory: jest.fn(),
    deleteStory: jest.fn(),
    recordView: jest.fn(),
  },
}))
jest.mock("../src/services/blockService", () => ({
  blockService: {
    getBlockedUsers: jest.fn(),
    blockUser: jest.fn(),
    unblockUser: jest.fn(),
  },
}))
jest.mock("../src/features/recipe/services/communityPostService", () => ({
  communityPostService: {
    getPosts: jest.fn(),
    getComments: jest.fn(),
  },
}))

import React from "react"
import {
  QueryClient,
  QueryClientProvider,
  QueryObserver,
} from "@tanstack/react-query"

import { communityStoryService } from "@/src/features/recipe/services/communityStoryService"
import { communityPostService } from "@/src/features/recipe/services/communityPostService"
import { blockService } from "@/src/services/blockService"
import {
  POSTS_KEY,
  invalidateFeedCaches,
} from "@/src/features/recipe/hooks/communityFeedCache"
import {
  STORIES_KEY,
  useCommunityStories,
} from "@/src/features/recipe/hooks/useCommunityStories"
import { POST_COMMENTS_KEY } from "@/src/features/recipe/hooks/usePostDetail"
import { useBlockedUsers } from "@/src/features/recipe/hooks/useBlockedUsers"
import type { CommunityStory } from "@/src/features/recipe/types/story"

// @types/react-dom 이 없어 타입 선언만 require 로 우회한다. 런타임은 정식 빌드 그대로다.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require("react-dom/server") as {
  renderToStaticMarkup: (node: unknown) => string
}

const getStories = communityStoryService.getStories as jest.Mock
const toggleLikeApi = communityStoryService.toggleLike as jest.Mock
const getComments = communityPostService.getComments as jest.Mock
const getPosts = communityPostService.getPosts as jest.Mock
const blockUserApi = blockService.blockUser as jest.Mock
const getBlockedUsers = blockService.getBlockedUsers as jest.Mock

const STORY_KEY = [...STORIES_KEY, "recommended"]
const POST_ID = "1"
const COMMENTS_KEY = [...POST_COMMENTS_KEY, POST_ID]
const FEED_KEY = [...POSTS_KEY, { tag: null, category: null, sort: "recent" }]

const BLOCKED_NAME = "차단대상"
const T0 = Date.UTC(2026, 7, 20, 9, 0, 0)

function story(id: string, overrides: Partial<CommunityStory> = {}) {
  return {
    id,
    authorId: 10,
    authorName: `작성자${id}`,
    imageUri: `https://example.test/${id}.jpg`,
    caption: null,
    likes: 3,
    liked: false,
    views: 0,
    isMine: false,
    createdAt: new Date(T0),
    expiresAt: new Date(T0 + 24 * 60 * 60_000),
    ...overrides,
  } satisfies CommunityStory
}

/** 마이크로태스크·매크로태스크를 넉넉히 비운다(변이 → 정산 → 재조회까지). */
async function flush() {
  for (let i = 0; i < 5; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

function newClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function render(client: QueryClient, Probe: () => null) {
  renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(Probe),
    ),
  )
}

/**
 * "화면에 붙어 있는 목록" 하나. 캐시는 이미 차 있고 신선하다(방금 받은 상태) —
 * 그래서 구독만으로는 아무 요청도 안 나간다. 뒤이어 무엇이 요청을 부르는지만 보인다.
 */
function mountList(
  client: QueryClient,
  queryKey: readonly unknown[],
  queryFn: () => Promise<unknown>,
  seed: unknown,
) {
  client.setQueryData(queryKey, seed)
  const observer = new QueryObserver(client, {
    queryKey,
    queryFn,
    staleTime: 60_000,
  })
  return observer.subscribe(() => {})
}

beforeEach(() => {
  jest.clearAllMocks()
  getBlockedUsers.mockResolvedValue([])
  toggleLikeApi.mockResolvedValue(undefined)
  blockUserApi.mockResolvedValue(undefined)
  // 다시 받으면 **다른 셔플**이 온다 — 서버의 `ORDER BY random()` 그대로.
  getStories.mockResolvedValue([story("c"), story("b"), story("a")])
  getComments.mockResolvedValue([])
  getPosts.mockResolvedValue({ posts: [], nextCursor: null })
})

describe("스토리 좋아요는 페이저를 다시 섞지 않는다 (R1)", () => {
  it("정산이 목록을 다시 받지 않는다 — 낡음 표시만 한다", async () => {
    const client = newClient()
    const unsubscribe = mountList(client, STORY_KEY, () => getStories(), [
      story("a"),
      story("b"),
      story("c"),
    ])

    let hook: ReturnType<typeof useCommunityStories> | null = null
    render(client, () => {
      hook = useCommunityStories("recommended")
      return null
    })
    if (hook === null) throw new Error("훅이 렌더되지 않았다")
    ;(hook as ReturnType<typeof useCommunityStories>).toggleLike("b")
    await flush()

    // 서버 요청은 하트 한 번(PUT)뿐이다.
    expect(toggleLikeApi).toHaveBeenCalledWith("b")
    expect(getStories).not.toHaveBeenCalled()

    const list = client.getQueryData<CommunityStory[]>(STORY_KEY)!
    expect(list.map((item) => item.id)).toEqual(["a", "b", "c"])
    expect(list.find((item) => item.id === "b")!.liked).toBe(true)
    expect(list.find((item) => item.id === "b")!.likes).toBe(4)

    // 그래도 **낡았다는 표시는 남는다** — 다음 자연 재검증이 마저 맞춘다.
    expect(client.getQueryState(STORY_KEY)!.isInvalidated).toBe(true)

    unsubscribe()
  })
})

describe("차단은 스토리와 댓글까지 다시 받는다 (R2)", () => {
  it("글·스토리·댓글 셋 다 서버 진실로 갈아 끼운다", async () => {
    const client = newClient()
    const offStories = mountList(client, STORY_KEY, () => getStories(), [
      story("a", { authorName: BLOCKED_NAME }),
      story("b"),
    ])
    const offComments = mountList(client, COMMENTS_KEY, () => getComments(), [])
    const offFeed = mountList(client, FEED_KEY, () => getPosts(), {
      pages: [{ posts: [], nextCursor: null }],
      pageParams: [undefined],
    })

    let hook: ReturnType<typeof useBlockedUsers> | null = null
    render(client, () => {
      hook = useBlockedUsers()
      return null
    })
    if (hook === null) throw new Error("훅이 렌더되지 않았다")

    await (hook as ReturnType<typeof useBlockedUsers>).blockUserAsync(
      BLOCKED_NAME,
    )
    await flush()

    expect(blockUserApi).toHaveBeenCalledWith(BLOCKED_NAME)
    expect(getPosts).toHaveBeenCalled()
    expect(getStories).toHaveBeenCalled()
    expect(getComments).toHaveBeenCalled()

    offStories()
    offComments()
    offFeed()
  })
})

describe("스토리·댓글은 좋아요 계보가 **아니다** (R2 의 반대편)", () => {
  it("피드 계보 무효화는 스토리·댓글을 건드리지 않는다", async () => {
    const client = newClient()
    const offStories = mountList(client, STORY_KEY, () => getStories(), [
      story("a"),
    ])
    const offComments = mountList(client, COMMENTS_KEY, () => getComments(), [])
    const offFeed = mountList(client, FEED_KEY, () => getPosts(), {
      pages: [{ posts: [], nextCursor: null }],
      pageParams: [undefined],
    })

    // 차단이 쓰는 것과 **같은** 강도(`"active"`)로 계보만 무효화한다.
    invalidateFeedCaches(client, "active")
    await flush()

    expect(getPosts).toHaveBeenCalled()
    expect(getStories).not.toHaveBeenCalled()
    expect(getComments).not.toHaveBeenCalled()

    offStories()
    offComments()
    offFeed()
  })
})
