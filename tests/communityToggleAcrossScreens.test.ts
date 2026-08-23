/**
 * **두 화면이 같은 글의 하트를 만질 때 캐시들이 같은 말을 하는가.**
 *
 * 목록 훅(`useCommunityPosts`)과 상세 훅(`usePostDetail`)은 **같은 레인**
 * (`communityToggleOrder`)으로 순서를 정한다 — 서버 절대값은 가장 나중에 시작한
 * 토글만 쓴다. 그래서 상세에서 누르고(1번) 뒤로 가서 목록에서 한 번 더 누르면(2번),
 * 확정값을 쓸 차례는 **목록 훅**에 온다. 목록 훅이 계보(피드·검색·인기)만 만지던
 * 시절에는 그때 상세 캐시가 1번의 낙관값 `{liked:true, likes:11}` 로 굳었다 —
 * 서버도 피드도 `{liked:false, likes:10}` 인데. 글을 다시 열면 한 번의 왕복 동안
 * 틀린 하트가 서 있었다(1번의 응답을 버리는 것은 **정상**이다 — 결함은 쓰는 범위였다).
 * 같은 뿌리로, 목록에서 누른 좋아요는 상세 캐시를 60초(staleTime) 동안 낡은 채로 뒀다.
 *
 * ## 어떻게 훅을 돌리나
 *
 * 두 훅 다 상태 전이가 **react-query 캐시**에 있고 `mutate()` 는 렌더 밖에서 돈다.
 * 그래서 `react-dom/server` 로 **한 번만** 렌더해 두 훅의 반환값을 붙잡고, 이후는
 * 캐시를 직접 읽어 단언한다(`restaurantBookmarkOptimistic.test.ts` 와 같은 처방).
 * 사본이 아니라 **실물 훅**이 돌기 때문에, 훅의 배선을 되돌리면 여기가 빨개진다.
 */
/* eslint-disable import/first */
jest.mock("../src/features/recipe/services/communityPostService", () => ({
  communityPostService: {
    setLiked: jest.fn(),
    setBookmarked: jest.fn(),
    getPost: jest.fn(),
    getPosts: jest.fn(),
    getComments: jest.fn(),
    recordPostView: jest.fn(() => new Promise(() => {})),
  },
}))

import React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { communityPostService } from "@/src/features/recipe/services/communityPostService"
import {
  POSTS_KEY,
  POST_DETAIL_KEY,
  type CommunityFeedData,
} from "@/src/features/recipe/hooks/communityFeedCache"
import {
  beginToggle,
  endToggle,
  ownsConfirmation,
} from "@/src/features/recipe/hooks/communityToggleOrder"
import { useCommunityPosts } from "@/src/features/recipe/hooks/useCommunityPosts"
import { usePostDetail } from "@/src/features/recipe/hooks/usePostDetail"
import type { CommunityMealPost } from "@/src/features/recipe/types"

// @types/react-dom 이 없어 타입 선언만 require 로 우회한다. 런타임은 정식 빌드 그대로다.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require("react-dom/server") as {
  renderToStaticMarkup: (node: unknown) => string
}

const POST_ID = "cross-hook"
const FEED_KEY = [...POSTS_KEY, { tag: null, category: null, sort: "recent" }]
const DETAIL_KEY = [...POST_DETAIL_KEY, POST_ID]

const setLiked = communityPostService.setLiked as jest.Mock

function post(overrides: Partial<CommunityMealPost> = {}): CommunityMealPost {
  return {
    id: POST_ID,
    authorId: 1,
    authorName: "글쓴이",
    authorRole: "user",
    category: "diet",
    imageUri: null,
    imageUris: [],
    imageObjectPaths: [],
    title: "제목",
    description: "본문",
    likes: 10,
    liked: false,
    comments: 0,
    views: 0,
    rank: null,
    bookmarked: false,
    createdAt: new Date("2026-08-20T00:00:00Z"),
    tags: [],
    vote: null,
    ...overrides,
  }
}

function feedPages(item: CommunityMealPost): CommunityFeedData {
  return {
    pages: [{ posts: [item], nextCursor: null }],
    pageParams: [undefined],
  }
}

/** 마이크로태스크·매크로태스크를 한 번 비운다. mutationFn 프라미스는 여기서 안 풀린다. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

interface BothScreens {
  client: QueryClient
  feed: ReturnType<typeof useCommunityPosts>
  detail: ReturnType<typeof usePostDetail>
}

function seededClient() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  client.setQueryData(FEED_KEY, feedPages(post()))
  return client
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
 * 피드 캐시를 깔고 **두 훅을 실제로** 렌더한다. 상세 캐시는 상세 훅이 마운트되면서
 * 피드 캐시에서 그대로 만들어진다(`initialData`) — 피드에서 글을 열었을 때와 같다.
 */
function mountBothScreens(): BothScreens {
  const client = seededClient()
  let feed: ReturnType<typeof useCommunityPosts> | null = null
  let detail: ReturnType<typeof usePostDetail> | null = null
  const Probe = () => {
    // 상세 화면은 피드 쿼리를 관찰하지 않는다(캐시만 읽는다) — 요청 0개.
    feed = useCommunityPosts({ observe: false })
    detail = usePostDetail(POST_ID)
    return null
  }
  render(client, Probe)
  if (feed === null || detail === null) throw new Error("훅이 렌더되지 않았다")
  return { client, feed, detail }
}

/** 상세를 한 번도 열지 않은 사용자 — 상세 캐시가 아예 없다. */
function mountFeedOnly(): {
  client: QueryClient
  feed: ReturnType<typeof useCommunityPosts>
} {
  const client = seededClient()
  let feed: ReturnType<typeof useCommunityPosts> | null = null
  const Probe = () => {
    feed = useCommunityPosts({ observe: false })
    return null
  }
  render(client, Probe)
  if (feed === null) throw new Error("훅이 렌더되지 않았다")
  return { client, feed }
}

const feedPost = (client: QueryClient) =>
  client.getQueryData<CommunityFeedData>(FEED_KEY)!.pages[0].posts[0]
const detailPost = (client: QueryClient) =>
  client.getQueryData<CommunityMealPost>(DETAIL_KEY)

/** 마개를 손으로 여는 `setLiked`. `settle[i]` 가 i 번째 요청이다. */
function deferredLikes() {
  const settle: ((value: { liked: boolean; likes: number }) => void)[] = []
  setLiked.mockImplementation(
    () =>
      new Promise<{ liked: boolean; likes: number }>((resolve) => {
        settle.push(resolve)
      }),
  )
  return settle
}

beforeEach(() => {
  setLiked.mockReset()
})

describe("상세 · 목록이 같은 글의 하트를 겹쳐 누른다", () => {
  it("확정값은 상세 캐시까지 간다 — 목록이 정산을 소유해도", async () => {
    const { client, feed, detail } = mountBothScreens()
    const settle = deferredLikes()

    // 1번: 상세에서 누른다(응답은 아직 안 온다).
    detail.togglePostLike()
    await flush()
    expect(detailPost(client)).toMatchObject({ liked: true, likes: 11 })

    // 2번: 뒤로 가서 목록에서 한 번 더 누른다 — 정산을 소유하는 것은 이쪽이다.
    feed.toggleLike(POST_ID)
    await flush()
    expect(feedPost(client)).toMatchObject({ liked: false, likes: 10 })

    // 서버는 두 번째 토글의 진실을 돌려준다.
    settle[1]({ liked: false, likes: 10 })
    await flush()
    // 첫 번째 응답은 뒤늦게 오고, 순번 판정이 **정상적으로** 버린다.
    settle[0]({ liked: true, likes: 11 })
    await flush()

    expect(feedPost(client)).toMatchObject({ liked: false, likes: 10 })
    // 여기가 `{liked:true, likes:11}` 로 굳던 자리 — 글을 다시 열면 틀린 하트였다.
    expect(detailPost(client)).toMatchObject({ liked: false, likes: 10 })
  })

  it("목록에서 누른 좋아요도 상세 캐시를 맞춘다 — 다시 열었을 때 하트가 어긋나지 않게", async () => {
    const { client, feed } = mountBothScreens()
    setLiked.mockResolvedValue({ liked: true, likes: 11 })

    feed.toggleLike(POST_ID)
    await flush()

    expect(feedPost(client)).toMatchObject({ liked: true, likes: 11 })
    /*
      계보 무효화(`invalidateFeedCaches`)는 상세 키를 훑지 않고 상세의 staleTime 은
      60초다 — 여기를 안 쓰면 그 60초 동안 다시 연 글이 낡은 하트를 그린다.
    */
    expect(detailPost(client)).toMatchObject({ liked: true, likes: 11 })
  })

  it("상세 캐시가 그 글을 안 들고 있으면 만들지 않는다", async () => {
    const { client, feed } = mountFeedOnly()
    setLiked.mockResolvedValue({ liked: true, likes: 11 })

    feed.toggleLike(POST_ID)
    await flush()

    expect(feedPost(client)).toMatchObject({ liked: true, likes: 11 })
    // 없던 캐시 항목을 하나 만들어 두면 다음 상세 진입이 "받은 적 없는 값" 을 믿는다.
    expect(detailPost(client)).toBeUndefined()
  })

  it("상세 캐시의 나이를 밀지 않는다 — 하트 한 번이 재검증을 막지 않게", async () => {
    const { client, feed } = mountBothScreens()
    const seededAt = client.getQueryState(DETAIL_KEY)!.dataUpdatedAt
    setLiked.mockResolvedValue({ liked: true, likes: 11 })

    feed.toggleLike(POST_ID)
    await flush()

    /*
      확정 절대값이라도 이 쓰기가 서버와 맞춘 것은 글 하나의 칸 몇 개뿐이다.
      "방금 맞췄다"(`dataUpdatedAt = now`)로 찍으면 본문·댓글 수의 재검증이
      staleTime 창 내내 막힌다(`patchPostEverywhere` 머리말).
    */
    expect(client.getQueryState(DETAIL_KEY)?.dataUpdatedAt).toBe(seededAt)
    expect(detailPost(client)).toMatchObject({ liked: true, likes: 11 })
  })

  it("목록의 실패 되돌리기도 두 캐시를 함께 되돌린다", async () => {
    const { client, feed } = mountBothScreens()
    setLiked.mockRejectedValue(new Error("network down"))

    feed.toggleLike(POST_ID)
    await flush()
    await flush()

    expect(feedPost(client)).toMatchObject({ liked: false, likes: 10 })
    expect(detailPost(client)).toMatchObject({ liked: false, likes: 10 })
  })
})

/**
 * 레인은 `onSettled` 의 `endToggle` 로 닫힌다. 그런데 `onMutate` 가 거절하면
 * query-core 는 `onSettled` 에 컨텍스트(`this.state.context`)를 넘기지 않는다 —
 * `endToggle(undefined)` 는 그냥 돌아가고 그 레인의 `pending` 은 영영 0 이 못 된다.
 * 그래서 번호와 델타를 한 벌로 묶어, 델타가 넘어지면 그 자리에서 닫는다.
 */
describe("레인은 새지 않는다", () => {
  it("낙관 델타가 던지면 그 자리에서 레인을 닫는다", () => {
    expect(() =>
      beginToggle("like", "leaky", () => {
        throw new Error("patch failed")
      }),
    ).toThrow("patch failed")

    // 레인이 남아 있으면 다음 토글이 2번부터 시작한다(그리고 지도에서 지워지지 않는다).
    const next = beginToggle("like", "leaky", () => {})
    expect(next.version).toBe(1)
    expect(ownsConfirmation(next)).toBe(true)
    endToggle(next)
  })

  it("델타가 정상이면 지금까지처럼 번호가 이어진다", () => {
    const first = beginToggle("like", "healthy", () => {})
    const second = beginToggle("like", "healthy", () => {})
    expect(second.version).toBe(2)
    // 옛 번호는 확정값을 쓰지 못한다 — 더 나중에 시작한 토글이 진실을 소유한다.
    expect(ownsConfirmation(first)).toBe(false)
    expect(ownsConfirmation(second)).toBe(true)
    endToggle(first)
    endToggle(second)
    // 마지막 하나가 끝나면 레인을 버린다 → 다음 토글은 다시 1번이다.
    const fresh = beginToggle("like", "healthy", () => {})
    expect(fresh.version).toBe(1)
    endToggle(fresh)
  })
})
