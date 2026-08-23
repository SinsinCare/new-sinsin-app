/**
 * **커뮤니티가 실제로 내보내는 요청 수**를 실물 `QueryClient`·옵저버로 센다.
 * 여기서 세는 세 가지는 전부 "화면은 그대로인데 회선만 시끄러웠던" 회귀다.
 *
 *  1. **댓글 정산**(`usePostDetail` 의 `settleComment`) — 계보를 통째로 무효화하면
 *     열 페이지를 읽은 사람이 댓글 하나를 달 때 GET 열 개가 나간다. 댓글 수는
 *     계보 패치로 맞추고 무효화는 **낡음 표시만** 한다.
 *  2. **상세의 피드 관찰**(`observe: "cold-only"`) — 캐시가 있으면 0개,
 *     콜드 스타트(푸시·공유 링크)면 **첫 장 하나**. 후자를 0개로 두면 "작성자의
 *     다른 글" 섹션이 통째로 사라진다.
 *  3. **피드 좋아요·북마크의 스코프** — 정적 스코프는 서로 **다른 글**의 토글까지
 *     한 줄로 세운다(A 가 느리면 B 가 그만큼 늦게 나간다). 그래서 걷어냈고, 같은 글이
 *     겹칠 때의 순서는 스코프가 아니라 **순번 판정**(`communityToggleOrder`)이 맡는다.
 *     델타 역패치만으로 순서가 무관해진다는 것은 **실패 경로에만** 맞는 말이었다 —
 *     서버 절대값을 쓰는 성공 경로는 그대로 순서를 탔다(그 실측과 표는
 *     `communityFeedCache.test.ts` 의 "겹치는 토글").
 *
 * `enabled` 계산과 훅의 배선은 렌더러가 없어 훅 본문으로 돌릴 수 없다
 * (`tests/helpers/hookHarness.ts` 머리말) — 요청 수는 옵저버로 재고, **훅이 그
 * 계산을 쓴다는 사실**은 소스 계약으로 못 박는다(마지막 describe).
 */
/* eslint-disable import/first */
jest.mock("../src/services/core/apiClient", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}))

import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  InfiniteQueryObserver,
  MutationObserver,
  QueryClient,
} from "@tanstack/react-query"

import {
  POSTS_KEY,
  flattenFeedPages,
  hasCachedFeedPages,
  invalidateFeedCaches,
  patchPostInFeedCaches,
  toggledLike,
  type CommunityFeedData,
} from "@/src/features/recipe/hooks/communityFeedCache"
import {
  beginToggle,
  endToggle,
  ownsConfirmation,
  ownsRevert,
  type ToggleTurn,
} from "@/src/features/recipe/hooks/communityToggleOrder"
import { communityFeedQueryKey } from "@/src/features/recipe/hooks/useCommunityPosts"
import { rankRelatedPosts } from "@/src/features/recipe/utils/postRanking"
import type { CommunityMealPost } from "@/src/features/recipe/types"

const ROOT = join(__dirname, "..")
const read = (path: string) => readFileSync(join(ROOT, path), "utf-8")

function post(id: string, overrides: Partial<CommunityMealPost> = {}) {
  return {
    id,
    authorId: 1,
    authorName: "글쓴이",
    authorRole: "user",
    category: "diet",
    imageUri: null,
    imageUris: [],
    imageObjectPaths: [],
    title: `제목 ${id}`,
    description: "본문",
    likes: 0,
    liked: false,
    comments: 0,
    views: 0,
    rank: null,
    bookmarked: false,
    createdAt: new Date("2026-08-20T00:00:00Z"),
    tags: [],
    vote: null,
    ...overrides,
  } satisfies CommunityMealPost
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

async function waitUntil(predicate: () => boolean) {
  for (let i = 0; i < 200; i += 1) {
    if (predicate()) return
    await tick()
  }
  throw new Error("조건이 만족되지 않았다")
}

const FEED_KEY = communityFeedQueryKey({})

/** 커서 페이지를 무한히 주는 피드 옵저버. 나간 요청 수를 센다. */
function feedObserver(
  queryClient: QueryClient,
  options: {
    enabled?: boolean
    posts?: (index: number) => CommunityMealPost[]
  } = {},
) {
  const calls = { count: 0 }
  const observer = new InfiniteQueryObserver(queryClient, {
    queryKey: FEED_KEY,
    queryFn: ({ pageParam }) => {
      calls.count += 1
      const index = Number(pageParam ?? 0)
      return Promise.resolve({
        posts: options.posts?.(index) ?? [post(`p${index}`)],
        nextCursor: String(index + 1),
      })
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: options.enabled ?? true,
    retry: false,
  })
  const unsubscribe = observer.subscribe(() => {})
  return { observer, calls, unsubscribe }
}

describe("댓글 정산은 피드 페이지를 다시 받지 않는다", () => {
  async function threePageFeed() {
    const queryClient = new QueryClient()
    const feed = feedObserver(queryClient)
    await waitUntil(
      () => feed.observer.getCurrentResult().data?.pages.length === 1,
    )
    await feed.observer.fetchNextPage()
    await feed.observer.fetchNextPage()
    expect(feed.observer.getCurrentResult().data?.pages).toHaveLength(3)
    feed.calls.count = 0
    return { queryClient, ...feed }
  }

  it("댓글 수는 계보 패치로 맞추고 무효화는 낡음 표시만 한다 — 요청 0개", async () => {
    const { queryClient, calls, unsubscribe } = await threePageFeed()

    // `settleComment(1)` 이 하는 두 가지(계보 패치 + 기본 무효화).
    patchPostInFeedCaches(queryClient, "p0", (item) => ({
      ...item,
      comments: item.comments + 1,
    }))
    invalidateFeedCaches(queryClient)
    await tick()

    expect(calls.count).toBe(0)
    const cached = queryClient.getQueryData<CommunityFeedData>(FEED_KEY)
    expect(flattenFeedPages(cached)?.find((p) => p.id === "p0")?.comments).toBe(
      1,
    )
    // 낡음 표시는 남는다 — 다음 자연 재검증이 서버 진실로 마저 맞춘다.
    expect(queryClient.getQueryState(FEED_KEY)?.isInvalidated).toBe(true)
    unsubscribe()
  })

  it("옛 코드(POSTS_KEY 통째 무효화)였다면 페이지 수만큼 나간다 (반례)", async () => {
    const { queryClient, calls, unsubscribe } = await threePageFeed()

    void queryClient.invalidateQueries({ queryKey: POSTS_KEY })
    await waitUntil(() => calls.count === 3)

    expect(calls.count).toBe(3)
    unsubscribe()
  })
})

describe("상세의 피드 관찰 — 캐시가 있으면 0개, 콜드 스타트면 한 장", () => {
  it("콜드 스타트: 캐시가 없으면 첫 장 하나를 받고 '다른 글' 섹션이 선다", async () => {
    const queryClient = new QueryClient()
    // 푸시 알림·공유 링크로 앱을 연 순간 — 피드 캐시가 아예 없다.
    expect(hasCachedFeedPages(queryClient, FEED_KEY)).toBe(false)

    const current = post("target", { tags: ["저염"] })
    const { observer, calls, unsubscribe } = feedObserver(queryClient, {
      // 훅이 `observe: "cold-only"` 에서 계산하는 그 값.
      enabled: !hasCachedFeedPages(queryClient, FEED_KEY),
      posts: () => [
        post("a", { tags: ["저염"] }),
        post("b", { category: "diet" }),
      ],
    })
    await waitUntil(() => observer.getCurrentResult().data?.pages.length === 1)

    // **한 장이다.** 상세에는 `fetchNextPage` 가 없어 여기서 더 늘지 않는다.
    expect(calls.count).toBe(1)

    const related = rankRelatedPosts(
      current,
      flattenFeedPages(observer.getCurrentResult().data),
      new Date("2026-08-20T01:00:00Z"),
      3,
    )
    // 섹션이 그려진다(화면은 `relatedPosts.length > 0` 에서만 그린다).
    expect(related.length).toBeGreaterThan(0)
    unsubscribe()
  })

  it("웜: 두 장이 이미 캐시에 있으면 요청이 0개다", async () => {
    const queryClient = new QueryClient()
    // 피드를 두 페이지 스크롤한 뒤 글을 연 사람.
    queryClient.setQueryData<CommunityFeedData>(FEED_KEY, {
      pages: [
        { posts: [post("a", { tags: ["저염"] })], nextCursor: "1" },
        { posts: [post("b")], nextCursor: "2" },
      ],
      pageParams: [undefined, "1"],
    })
    expect(hasCachedFeedPages(queryClient, FEED_KEY)).toBe(true)

    const { observer, calls, unsubscribe } = feedObserver(queryClient, {
      enabled: !hasCachedFeedPages(queryClient, FEED_KEY),
    })
    await tick()
    await tick()

    expect(calls.count).toBe(0)
    // 캐시는 그대로 읽힌다 — "다른 글" 후보는 여기서 나온다.
    expect(
      flattenFeedPages(observer.getCurrentResult().data).map((p) => p.id),
    ).toEqual(["a", "b"])
    unsubscribe()
  })
})

describe("피드 토글은 서로 다른 글을 줄 세우지 않는다", () => {
  /**
   * 피드 훅의 좋아요 변이와 **같은 배선**이다(스코프만 인자로 받는다):
   * 순번을 받고 델타를 걸고, 확정값은 최신일 때만 쓰고, 되돌리기는 내 델타가
   * 아직 있을 때만 한다(`communityToggleOrder`). 여기 요청은 전부 실패하므로
   * 확정값 경로는 타지 않지만, 배선이 갈라지면 이 헬퍼가 훅을 대변하지 못한다.
   */
  function likeObserver(
    queryClient: QueryClient,
    started: string[],
    settle: ((reason: unknown) => void)[],
    scope?: { id: string },
  ) {
    return new MutationObserver<
      { liked: boolean; likes: number } | null,
      Error,
      string,
      ToggleTurn
    >(queryClient, {
      mutationFn: (postId: string) => {
        started.push(postId)
        return new Promise((_resolve, reject) => settle.push(reject))
      },
      ...(scope ? { scope } : {}),
      retry: false,
      onMutate: async (postId) =>
        beginToggle("like", postId, () =>
          patchPostInFeedCaches(queryClient, postId, toggledLike),
        ),
      onSuccess: (confirmed, postId, turn) => {
        if (confirmed && ownsConfirmation(turn)) {
          patchPostInFeedCaches(queryClient, postId, (p) => ({
            ...p,
            ...confirmed,
          }))
        }
      },
      onError: (_error, postId, turn) => {
        // 내가 건 델타만 되돌린다(자기 역함수) — 확정값이 지나갔으면 빼지 않는다.
        if (ownsRevert(turn)) {
          patchPostInFeedCaches(queryClient, postId, toggledLike)
        }
      },
      onSettled: (_data, _error, _postId, turn) => endToggle(turn),
    })
  }

  function twoPostClient() {
    const queryClient = new QueryClient()
    queryClient.setQueryData<CommunityFeedData>(FEED_KEY, {
      pages: [
        {
          posts: [
            post("a", { liked: false, likes: 10 }),
            post("b", { liked: true, likes: 4 }),
          ],
          nextCursor: null,
        },
      ],
      pageParams: [undefined],
    })
    return queryClient
  }

  const cached = (queryClient: QueryClient, id: string) =>
    flattenFeedPages(
      queryClient.getQueryData<CommunityFeedData>(FEED_KEY),
    ).find((p) => p.id === id)!

  it("A 와 B 의 토글이 동시에 나가고, 둘 다 실패해도 둘 다 원상으로 돌아온다", async () => {
    const queryClient = twoPostClient()
    const started: string[] = []
    const settle: ((reason: unknown) => void)[] = []
    const observer = likeObserver(queryClient, started, settle)

    void observer.mutate("a").catch(() => {})
    void observer.mutate("b").catch(() => {})
    await tick()

    // **둘 다 이미 나갔다** — B 가 A 의 응답을 기다리지 않는다.
    expect(started).toEqual(["a", "b"])
    // 낙관 갱신은 두 글에 각각 걸려 있다.
    expect(cached(queryClient, "a")).toMatchObject({ liked: true, likes: 11 })
    expect(cached(queryClient, "b")).toMatchObject({ liked: false, likes: 3 })

    settle[1](new Error("B 실패"))
    settle[0](new Error("A 실패"))
    await waitUntil(
      () => !cached(queryClient, "a").liked && cached(queryClient, "b").liked,
    )

    // 실패 순서가 뒤바뀌어도(먼저 건 쪽이 나중에 실패) 둘 다 정확히 원상이다.
    expect(cached(queryClient, "a")).toMatchObject({ liked: false, likes: 10 })
    expect(cached(queryClient, "b")).toMatchObject({ liked: true, likes: 4 })
  })

  it("정적 스코프가 있었다면 B 의 요청은 A 가 끝날 때까지 나가지 않는다 (반례)", async () => {
    const queryClient = twoPostClient()
    const started: string[] = []
    const settle: ((reason: unknown) => void)[] = []
    const observer = likeObserver(queryClient, started, settle, {
      id: "community-post-like",
    })

    void observer.mutate("a").catch(() => {})
    void observer.mutate("b").catch(() => {})
    await tick()

    expect(started).toEqual(["a"])
    settle[0](new Error("A 실패"))
    await waitUntil(() => started.length === 2)
    expect(started).toEqual(["a", "b"])
  })
})

describe("훅이 이 계산을 실제로 쓴다 (소스 계약)", () => {
  it("피드 훅의 enabled 는 hasCachedFeedPages 에서 온다", () => {
    const feed = read("src/features/recipe/hooks/useCommunityPosts.ts")
    expect(feed).toContain('observe === "cold-only"')
    expect(feed).toContain("!hasCachedFeedPages(queryClient, queryKey)")
    expect(feed).toContain("enabled,")
  })

  it("두 목록 훅이 꼬리 상태를 useInfiniteTail 에서 받는다", () => {
    for (const path of [
      "src/features/recipe/hooks/useCommunityPosts.ts",
      "src/features/recipe/hooks/useCommunityPostSearch.ts",
    ]) {
      const source = read(path)
      expect(source).toContain("useInfiniteTail(queryKey)")
      // 옵저버 플래그가 아니라 훅이 기억한 사실을 내보낸다.
      expect(source).toContain("isFetchNextPageError: isTailError")
      // 원인과 "취소로 접힘" 도 함께 — 문구를 옵저버에서 읽으면 낙관 패치에 지워진다.
      expect(source).toContain("nextPageError: tailError")
      expect(source).toContain("isTailStalled")
      /*
        다음 장을 받고 결과를 기록하는 래퍼는 **한 벌**이다(`fetchNextTailPage`).
        두 훅이 각자 `try/catch` 를 들고 있던 시절에는 한쪽만 고치는 사고가 났다 —
        실제로 "취소로 접힌 다음 장" 판정이 그렇게 갈릴 뻔한 자리다.
      */
      expect(source).toContain("fetchNextTailPage({")
      expect(source).toContain("markTailStalled,")
    }
  })

  it("댓글 정산은 계보 패치 + 낡음 표시만 한다", () => {
    const detail = read("src/features/recipe/hooks/usePostDetail.ts")
    expect(detail).toContain("const settleComment = (commentDelta: number)")
    expect(detail).toContain("settleComment(1)")
    expect(detail).toContain("settleComment(-1)")
    expect(detail).toContain("invalidateFeedCaches(queryClient)")
  })
})
