/**
 * 커뮤니티 캐시 계보(`communityFeedCache`)의 순수 동작 검사.
 *
 *  - 평탄화의 id 중복 제거: 서버 랭킹 정렬(조회순·인기순)은 점수가 페이지 사이에
 *    변하면 같은 글이 두 페이지에 올 수 있다(계약상 best-effort). 걷지 않으면
 *    FlashList 가 중복 키를 받는다.
 *  - 패치·삭제가 **평면 배열 모양**(인기글 캐시)도 함께 쓴다 — 여기만 빠지면
 *    지운 글이 인기 레일에 남는다(탭 → 오류 화면).
 *  - 당김 새로고침의 페이지 자르기는 **그 필터 조합 하나만** — 다만 기본 조합에서는
 *    내 활동 보관함이 같은 쿼리를 공유하므로 같이 잘린다(키 해시가 같다는 것을
 *    아래에서 못 박는다).
 *  - 낙관 패치는 **신선도를 주장하지 않는다** — 그 글이 없는 쿼리는 건드리지 않고,
 *    있는 쿼리도 `dataUpdatedAt` 을 밀지 않는다(복귀 재검증이 죽지 않게).
 *  - 하트 연타: 델타 역패치(자기 역함수) + **순번 판정**(`communityToggleOrder`).
 *    어떤 순서로 겹치고 어떤 순서로 응답이 와도 캐시는 마지막에 시작한 토글의
 *    서버 확정값으로 끝난다. 여기만 실제 `MutationObserver`·`InfiniteQueryObserver`
 *    를 돌린다.
 */
/* eslint-disable import/first */
/*
  스코프·훅 상수를 실물로 들여오면 서비스 계층을 지나 `apiClient` 까지 딸려 온다
  (모듈 로드 시 `EXPO_PUBLIC_BACKEND_URL` 을 요구한다). 여기서 네트워크를 쓸 일은
  없으므로 로드만 되게 세운다 — `communityPostService.test.ts` 와 같은 처방.
*/
jest.mock("../src/services/core/apiClient", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}))

import {
  InfiniteQueryObserver,
  MutationObserver,
  QueryClient,
  hashKey,
} from "@tanstack/react-query"

import {
  COMMUNITY_POPULAR_KEY,
  POSTS_KEY,
  POST_SEARCH_KEY,
  findPostInFeedCaches,
  flattenFeedPages,
  hasCachedFeedPages,
  invalidateFeedCaches,
  patchPostEverywhere,
  patchPostInFeedCaches,
  removePostFromFeedCaches,
  toggledBookmark,
  toggledLike,
  trimFeedCacheToFirstPage,
  type CommunityFeedData,
} from "@/src/features/recipe/hooks/communityFeedCache"
import {
  beginToggle,
  endToggle,
  ownsConfirmation,
  ownsRevert,
  type ToggleKind,
} from "@/src/features/recipe/hooks/communityToggleOrder"
import { communityFeedQueryKey } from "@/src/features/recipe/hooks/useCommunityPosts"
import { COMMUNITY_POST_REFRESH } from "@/src/features/recipe/refresh/scopes"
import type { CommunityMealPost } from "@/src/features/recipe/types"

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
    createdAt: new Date("2026-06-23T00:00:00Z"),
    tags: [],
    vote: null,
    ...overrides,
  } satisfies CommunityMealPost
}

function pages(...postsPerPage: CommunityMealPost[][]): CommunityFeedData {
  return {
    pages: postsPerPage.map((posts, index) => ({
      posts,
      nextCursor:
        index < postsPerPage.length - 1 ? `cursor-${index + 1}` : null,
    })),
    pageParams: postsPerPage.map((_, index) =>
      index === 0 ? undefined : `cursor-${index}`,
    ),
  }
}

describe("flattenFeedPages", () => {
  it("페이지 경계를 지우고 순서를 지킨다", () => {
    const flat = flattenFeedPages(pages([post("a"), post("b")], [post("c")]))
    expect(flat.map((p) => p.id)).toEqual(["a", "b", "c"])
  })

  it("페이지에 걸친 같은 글은 첫 등장만 남긴다 — 랭킹 정렬의 중복 커서", () => {
    const first = post("dup", { likes: 3 })
    const again = post("dup", { likes: 5 })
    const flat = flattenFeedPages(pages([post("a"), first], [again, post("b")]))
    expect(flat.map((p) => p.id)).toEqual(["a", "dup", "b"])
    // 첫 등장 유지 — 나중 페이지의 사본으로 바꿔치기하지 않는다.
    expect(flat[1].likes).toBe(3)
  })

  it("빈 데이터는 빈 목록", () => {
    expect(flattenFeedPages(undefined)).toEqual([])
  })
})

describe("계보 패치 — 페이지 모양과 평면 배열 모양을 함께 쓴다", () => {
  function seededClient() {
    const queryClient = new QueryClient()
    queryClient.setQueryData(
      [...POSTS_KEY, { tag: null, category: null, sort: "recent" }],
      pages([post("a"), post("b")]),
    )
    queryClient.setQueryData([...POST_SEARCH_KEY, "저염"], pages([post("a")]))
    // 인기글 캐시는 평면 배열이다.
    queryClient.setQueryData(
      [...COMMUNITY_POPULAR_KEY, "realtime", null, 5],
      [post("a"), post("c")],
    )
    return queryClient
  }

  it("patchPostInFeedCaches 는 인기(배열) 캐시의 같은 글도 고친다", () => {
    const queryClient = seededClient()
    patchPostInFeedCaches(queryClient, "a", (p) => ({
      ...p,
      liked: true,
      likes: p.likes + 1,
    }))

    const popular = queryClient.getQueryData<CommunityMealPost[]>([
      ...COMMUNITY_POPULAR_KEY,
      "realtime",
      null,
      5,
    ])
    expect(popular?.find((p) => p.id === "a")).toMatchObject({
      liked: true,
      likes: 1,
    })
    // 다른 글은 손대지 않는다.
    expect(popular?.find((p) => p.id === "c")).toMatchObject({ liked: false })

    const feed = queryClient.getQueryData<CommunityFeedData>([
      ...POSTS_KEY,
      { tag: null, category: null, sort: "recent" },
    ])
    expect(feed?.pages[0].posts.find((p) => p.id === "a")).toMatchObject({
      liked: true,
    })
  })

  it("removePostFromFeedCaches 는 인기(배열) 캐시에서도 지운다", () => {
    const queryClient = seededClient()
    removePostFromFeedCaches(queryClient, "a")

    const popular = queryClient.getQueryData<CommunityMealPost[]>([
      ...COMMUNITY_POPULAR_KEY,
      "realtime",
      null,
      5,
    ])
    expect(popular?.map((p) => p.id)).toEqual(["c"])

    const search = queryClient.getQueryData<CommunityFeedData>([
      ...POST_SEARCH_KEY,
      "저염",
    ])
    expect(search?.pages[0].posts).toEqual([])
  })

  it("제거는 남은 글의 rank 를 다시 매기지 않는다 — 번호는 화면이 index 로 그린다", () => {
    const queryClient = new QueryClient()
    const popularKey = [...COMMUNITY_POPULAR_KEY, "realtime", null, 50]
    queryClient.setQueryData(popularKey, [
      post("a", { rank: 1 }),
      post("b", { rank: 2 }),
      post("c", { rank: 3 }),
    ])

    removePostFromFeedCaches(queryClient, "b")

    const popular = queryClient.getQueryData<CommunityMealPost[]>(popularKey)
    /*
      **일부러 재넘버링하지 않는다.** 여기서 다시 매겨도 차단 필터 경로
      (화면이 캐시를 그대로 그리며 행을 접는다)는 못 덮으므로, 순위 배지는
      `CommunityPopularScreen` 이 목록 index+1 로 그린다. 다음 사람이 반대 방향
      (캐시에서 재넘버링)으로 고치지 않게 여기 고정해 둔다.
    */
    expect(popular?.map((p) => p.rank)).toEqual([1, 3])
  })

  it("findPostInFeedCaches 는 글과 원본 쿼리의 dataUpdatedAt 을 함께 준다", () => {
    const queryClient = seededClient()
    const found = findPostInFeedCaches(queryClient, "c")
    expect(found?.post.id).toBe("c")
    // initialDataUpdatedAt 으로 넘길 시각 — 0(관측 없음)이면 사본이 "지금" 으로 찍힌다.
    expect(found?.dataUpdatedAt).toBeGreaterThan(0)
    expect(findPostInFeedCaches(queryClient, "없는글")).toBeUndefined()
  })
})

describe("trimFeedCacheToFirstPage", () => {
  it("지정한 필터 조합만 1페이지로 자르고 다른 조합은 두지 않는다", () => {
    const queryClient = new QueryClient()
    const activeKey = [
      ...POSTS_KEY,
      { tag: null, category: null, sort: "recent" },
    ]
    const otherKey = [
      ...POSTS_KEY,
      { tag: null, category: "diet", sort: "recent" },
    ]
    queryClient.setQueryData(
      activeKey,
      pages([post("a")], [post("b")], [post("c")]),
    )
    queryClient.setQueryData(otherKey, pages([post("d")], [post("e")]))

    trimFeedCacheToFirstPage(queryClient, activeKey)

    const active = queryClient.getQueryData<CommunityFeedData>(activeKey)
    expect(active?.pages).toHaveLength(1)
    expect(active?.pageParams).toHaveLength(1)

    // 화면 밖 조합(보관함이 공유하는 기본 조합 등)은 건드리지 않는다.
    const other = queryClient.getQueryData<CommunityFeedData>(otherKey)
    expect(other?.pages).toHaveLength(2)
  })
})

describe("낙관 패치는 신선도를 주장하지 않는다", () => {
  const feedKey = [...POSTS_KEY, { tag: null, category: null, sort: "recent" }]
  const popularKey = [...COMMUNITY_POPULAR_KEY, "realtime", null, 50]
  /** 캐시가 서버와 맞았던 시각. 지금과 확실히 다른 값이어야 밀림이 보인다. */
  const SEEDED_AT = 1_000

  function seededClient() {
    const queryClient = new QueryClient()
    queryClient.setQueryData(feedKey, pages([post("a"), post("b")]), {
      updatedAt: SEEDED_AT,
    })
    queryClient.setQueryData(popularKey, [post("c")], { updatedAt: SEEDED_AT })
    return queryClient
  }

  it("그 글이 없는 쿼리는 아예 건드리지 않는다", () => {
    const queryClient = seededClient()
    const before = queryClient.getQueryData(popularKey)

    // "a" 는 피드에만 있다 — 인기 캐시는 이 패치와 무관하다.
    patchPostInFeedCaches(queryClient, "a", (p) => ({ ...p, views: 99 }))

    expect(queryClient.getQueryState(popularKey)?.dataUpdatedAt).toBe(SEEDED_AT)
    // 값이 같은 새 객체조차 만들지 않는다(만들면 그 쿼리가 "변했다" 로 기록된다).
    expect(queryClient.getQueryData(popularKey)).toBe(before)
  })

  it("그 글이 있는 쿼리도 dataUpdatedAt 을 보존한다", () => {
    const queryClient = seededClient()

    patchPostInFeedCaches(queryClient, "a", (p) => ({ ...p, views: 99 }))

    const feed = queryClient.getQueryData<CommunityFeedData>(feedKey)
    expect(feed?.pages[0].posts[0].views).toBe(99)
    /*
      값은 바뀌었지만 "서버와 맞춘 시각" 은 그대로다. 밀면 `useRevalidateOnReturn` 의
      `stale: true` 판정이 한 staleTime 창 동안 아무 것도 재조회하지 않는다 —
      조회수 패치 한 번에 목록이 30초 더 묵던 결함.
    */
    expect(queryClient.getQueryState(feedKey)?.dataUpdatedAt).toBe(SEEDED_AT)
  })

  it("삭제도 그 글이 없는 쿼리를 건드리지 않는다", () => {
    const queryClient = seededClient()
    const before = queryClient.getQueryData(popularKey)

    removePostFromFeedCaches(queryClient, "a")

    expect(queryClient.getQueryData(popularKey)).toBe(before)
    expect(queryClient.getQueryState(popularKey)?.dataUpdatedAt).toBe(SEEDED_AT)
  })
})

/**
 * ─── 겹치는 토글의 불변식 ────────────────────────────────────────────────────
 * 어떤 순서로 겹치고 어떤 순서로 응답이 오더라도:
 *  (1) 캐시의 최종 상태 = **마지막에 시작한** 토글이 서버에서 받은 결과,
 *  (2) 정산된 응답이 더 옛 응답에 덮이지 않는다,
 *  (3) 이미 사라진 델타를 실패 되돌리기가 한 번 더 빼지 않는다.
 * 아래 표가 그 불변식을 경우마다 찍는다(전부 실물 `MutationObserver`).
 */
describe("겹치는 토글 — 델타 역패치 + 순번 판정", () => {
  const feedKey = [...POSTS_KEY, { tag: null, category: null, sort: "recent" }]

  /** `{liked:false, likes:10}` 인 글 하나만 든 피드. */
  function likedClient(...postIds: string[]) {
    const queryClient = new QueryClient()
    queryClient.setQueryData(
      feedKey,
      pages(postIds.map((id) => post(id, { liked: false, likes: 10 }))),
    )
    return queryClient
  }

  const cachedPost = (queryClient: QueryClient, postId: string) =>
    queryClient
      .getQueryData<CommunityFeedData>(feedKey)!
      .pages[0].posts.find((p) => p.id === postId)!

  type LikeResult = { liked: boolean; likes: number } | null

  /**
   * 훅(`usePostDetail` / `useCommunityPosts`)의 좋아요 변이와 **같은 배선**이다:
   * `onMutate` 가 순번을 받고 델타를 걸고 → `onSuccess` 는 **자기가 최신일 때만**
   * 서버 절대값을 쓰고 → `onError` 는 **자기 델타가 아직 있을 때만** 되돌리고 →
   * `onSettled` 가 순번을 닫는다.
   *
   * `serialize` 는 상세 훅의 글 단위 스코프다(피드 훅에는 없다 — 행이 mutation
   * 하나를 공유해서 글 id 를 넣을 수 없고, 정적 스코프는 **다른 글**까지 줄 세운다).
   * 소스가 이 배선을 유지하는지는 `communityDesignContract.test.ts` 가 본다.
   */
  function toggleObserver(
    queryClient: QueryClient,
    mutationFn: () => Promise<LikeResult>,
    options: { postId: string; serialize?: boolean },
  ) {
    const { postId, serialize = false } = options
    return new MutationObserver(queryClient, {
      mutationFn,
      ...(serialize ? { scope: { id: `post-like-${postId}` } } : {}),
      retry: false,
      onMutate: () =>
        // 번호와 델타는 한 벌이다 — 사이에 아무것도 오지 못한다(훅과 같은 배선).
        beginToggle("like", postId, () =>
          patchPostEverywhere(queryClient, postId, toggledLike),
        ),
      onSuccess: (confirmed, _variables, turn) => {
        if (confirmed && ownsConfirmation(turn)) {
          patchPostEverywhere(queryClient, postId, (p) => ({
            ...p,
            ...confirmed,
          }))
        }
      },
      onError: (_error, _variables, turn) => {
        if (ownsRevert(turn)) {
          patchPostInFeedCaches(queryClient, postId, toggledLike)
        }
      },
      onSettled: (_data, _error, _variables, turn) => endToggle(turn),
    })
  }

  /** 응답 시각을 손으로 정하는 토글. `settle[i]` 가 i 번째 요청의 마개다. */
  function deferredToggle(
    queryClient: QueryClient,
    options: { postId: string; serialize?: boolean },
  ) {
    const settle: {
      resolve: (value: LikeResult) => void
      reject: (reason: unknown) => void
    }[] = []
    const observer = toggleObserver(
      queryClient,
      () =>
        new Promise<LikeResult>((resolve, reject) => {
          settle.push({ resolve, reject })
        }),
      options,
    )
    return { observer, settle }
  }

  it("둘 다 실패하면 정확히 원상으로 돌아온다", async () => {
    const queryClient = likedClient("fail-both")
    const observer = toggleObserver(
      queryClient,
      () => Promise.reject(new Error("network down")),
      { postId: "fail-both" },
    )

    await Promise.all([
      observer.mutate().catch(() => {}),
      observer.mutate().catch(() => {}),
    ])

    expect(cachedPost(queryClient, "fail-both")).toMatchObject({
      liked: false,
      likes: 10,
    })
  })

  it("둘 다 성공 + 응답이 뒤바뀌어 와도 마지막 토글의 확정값이 남는다", async () => {
    const queryClient = likedClient("reorder")
    const { observer, settle } = deferredToggle(queryClient, {
      postId: "reorder",
    })

    const first = observer.mutate().catch(() => {})
    const second = observer.mutate().catch(() => {})
    await tick()
    // 스코프가 없으므로 두 요청 모두 즉시 나간다(다른 글도 기다리지 않는다).
    expect(settle).toHaveLength(2)

    // 서버의 최종 진실은 "좋아요 → 취소" 다. 응답은 2번이 먼저, 1번이 나중에 온다.
    settle[1].resolve({ liked: false, likes: 10 })
    await tick()
    settle[0].resolve({ liked: true, likes: 11 })
    await Promise.all([first, second])

    // 나중에 도착한 **옛 응답**이 새 응답을 덮지 않는다.
    expect(cachedPost(queryClient, "reorder")).toMatchObject({
      liked: false,
      likes: 10,
    })
  })

  it("순번 없이 절대값을 그대로 쓰면 옛 응답이 새 응답을 덮는다(반례)", async () => {
    const queryClient = likedClient("no-order")
    const settle: ((value: LikeResult) => void)[] = []
    // 옛 배선 — `onSuccess` 가 조건 없이 서버 절대값을 쓴다.
    const observer = new MutationObserver(queryClient, {
      mutationFn: () => new Promise<LikeResult>((r) => settle.push(r)),
      retry: false,
      onMutate: () => {
        patchPostInFeedCaches(queryClient, "no-order", toggledLike)
      },
      onSuccess: (confirmed) => {
        if (confirmed) {
          patchPostInFeedCaches(queryClient, "no-order", (p) => ({
            ...p,
            ...confirmed,
          }))
        }
      },
    })

    void observer.mutate().catch(() => {})
    void observer.mutate().catch(() => {})
    await tick()
    settle[1]({ liked: false, likes: 10 })
    await tick()
    settle[0]({ liked: true, likes: 11 })
    await tick()

    // 서버는 "안 눌렸다" 고 아는데 하트는 눌린 채로 남는다 — 고치기 전의 그 결함.
    expect(cachedPost(queryClient, "no-order")).toMatchObject({
      liked: true,
      likes: 11,
    })
  })

  it("순번 없이 되돌리면 이미 지워진 델타를 한 번 더 뺀다(반례)", async () => {
    const queryClient = likedClient("blind-revert")
    const settle: {
      resolve: (value: LikeResult) => void
      reject: (reason: unknown) => void
    }[] = []
    // 옛 배선 — `onError` 가 조건 없이 델타를 되돌린다.
    const observer = new MutationObserver(queryClient, {
      mutationFn: () =>
        new Promise<LikeResult>((resolve, reject) => {
          settle.push({ resolve, reject })
        }),
      retry: false,
      onMutate: () => {
        patchPostInFeedCaches(queryClient, "blind-revert", toggledLike)
      },
      onSuccess: (confirmed) => {
        if (confirmed) {
          patchPostInFeedCaches(queryClient, "blind-revert", (p) => ({
            ...p,
            ...confirmed,
          }))
        }
      },
      onError: () => {
        patchPostInFeedCaches(queryClient, "blind-revert", toggledLike)
      },
    })

    const first = observer.mutate().catch(() => {})
    const second = observer.mutate().catch(() => {})
    await tick()
    settle[0].resolve({ liked: true, likes: 11 })
    await tick()
    settle[1].reject(new Error("network down"))
    await Promise.all([first, second])

    /*
      서버가 아는 값은 `{liked:true, likes:11}`(1번만 처리됐다). 그런데 1번의 확정값이
      2번의 델타를 이미 지운 뒤라, 조건 없는 역토글이 없는 델타를 한 번 더 뺀다.
    */
    expect(cachedPost(queryClient, "blind-revert")).toMatchObject({
      liked: false,
      likes: 10,
    })
  })

  it("첫 탭 성공 + 둘째 탭 실패 → 서버가 아는 값(눌림)으로 남는다", async () => {
    const queryClient = likedClient("ok-then-fail")
    const { observer, settle } = deferredToggle(queryClient, {
      postId: "ok-then-fail",
    })

    const first = observer.mutate().catch(() => {})
    const second = observer.mutate().catch(() => {})
    await tick()

    // 서버는 1번만 처리했다(2번은 회선에서 죽었다) → 진실은 `{liked:true, likes:11}`.
    settle[0].resolve({ liked: true, likes: 11 })
    await tick()
    settle[1].reject(new Error("network down"))
    await Promise.all([first, second])

    expect(cachedPost(queryClient, "ok-then-fail")).toMatchObject({
      liked: true,
      likes: 11,
    })
  })

  it("첫 탭 실패 + 둘째 탭 성공(실패가 먼저 도착)", async () => {
    const queryClient = likedClient("fail-first")
    const { observer, settle } = deferredToggle(queryClient, {
      postId: "fail-first",
    })

    const first = observer.mutate().catch(() => {})
    const second = observer.mutate().catch(() => {})
    await tick()

    settle[0].reject(new Error("network down"))
    await tick()
    // 서버가 실제로 처리한 것은 2번 하나 — `{liked:true, likes:11}`.
    settle[1].resolve({ liked: true, likes: 11 })
    await Promise.all([first, second])

    expect(cachedPost(queryClient, "fail-first")).toMatchObject({
      liked: true,
      likes: 11,
    })
  })

  it("첫 탭 실패 + 둘째 탭 성공(확정값이 먼저 도착) — 되돌리기가 그것을 깎지 않는다", async () => {
    const queryClient = likedClient("confirm-first")
    const { observer, settle } = deferredToggle(queryClient, {
      postId: "confirm-first",
    })

    const first = observer.mutate().catch(() => {})
    const second = observer.mutate().catch(() => {})
    await tick()

    settle[1].resolve({ liked: true, likes: 11 })
    await tick()
    // 이 시점에 1번의 델타는 확정값에 이미 지워졌다 — 한 번 더 빼면 서버가 모르는 값이 된다.
    settle[0].reject(new Error("network down"))
    await Promise.all([first, second])

    expect(cachedPost(queryClient, "confirm-first")).toMatchObject({
      liked: true,
      likes: 11,
    })
  })

  it("좋아요와 북마크가 한 글에 겹쳐도 서로의 확정값을 버리지 않는다", async () => {
    const queryClient = likedClient("mixed")
    const likeSettle: ((value: LikeResult) => void)[] = []
    const bookmarkSettle: ((value: { bookmarked: boolean } | null) => void)[] =
      []

    const like = toggleObserver(
      queryClient,
      () => new Promise<LikeResult>((r) => likeSettle.push(r)),
      { postId: "mixed" },
    )
    /** 북마크 변이의 배선 — 레인만 다르고 규칙은 같다. */
    const bookmark = new MutationObserver(queryClient, {
      mutationFn: () =>
        new Promise<{ bookmarked: boolean } | null>((r) =>
          bookmarkSettle.push(r),
        ),
      retry: false,
      onMutate: () =>
        beginToggle("bookmark", "mixed", () =>
          patchPostEverywhere(queryClient, "mixed", toggledBookmark),
        ),
      onSuccess: (confirmed, _variables, turn) => {
        if (confirmed && ownsConfirmation(turn)) {
          patchPostEverywhere(queryClient, "mixed", (p) => ({
            ...p,
            ...confirmed,
          }))
        }
      },
      onError: (_error, _variables, turn) => {
        if (ownsRevert(turn)) {
          patchPostInFeedCaches(queryClient, "mixed", toggledBookmark)
        }
      },
      onSettled: (_data, _error, _variables, turn) => endToggle(turn),
    })

    const likePromise = like.mutate().catch(() => {})
    const bookmarkPromise = bookmark.mutate().catch(() => {})
    await tick()
    expect(likeSettle).toHaveLength(1)
    expect(bookmarkSettle).toHaveLength(1)

    bookmarkSettle[0]({ bookmarked: true })
    await tick()
    likeSettle[0]({ liked: true, likes: 11 })
    await Promise.all([likePromise, bookmarkPromise])

    // 종류가 다르면 레인도 다르다 — 나중에 온 좋아요가 북마크 확정값을 지우지 않는다.
    expect(cachedPost(queryClient, "mixed")).toMatchObject({
      liked: true,
      likes: 11,
      bookmarked: true,
    })
  })

  it("서로 다른 글은 줄 서지 않는다 — 두 요청이 동시에 떠 있다", async () => {
    const queryClient = likedClient("post-a", "post-b")
    const a = deferredToggle(queryClient, { postId: "post-a" })
    const b = deferredToggle(queryClient, { postId: "post-b" })

    void a.observer.mutate().catch(() => {})
    void b.observer.mutate().catch(() => {})
    await tick()

    // A 가 느린 회선에 묶여 있어도 B 의 요청은 이미 나갔다(정적 스코프의 대가였다).
    expect(a.settle).toHaveLength(1)
    expect(b.settle).toHaveLength(1)

    a.settle[0].resolve({ liked: true, likes: 11 })
    b.settle[0].resolve({ liked: true, likes: 11 })
    await tick()
    expect(cachedPost(queryClient, "post-a").liked).toBe(true)
    expect(cachedPost(queryClient, "post-b").liked).toBe(true)
  })

  it("떠 둔 값을 되씌우는 옛 방식이었다면 하트가 눌린 채 남는다(반례)", async () => {
    const queryClient = likedClient("snapshot")
    /*
      스코프는 **요청만** 줄 세운다 — `onMutate` 는 즉시 돌기 때문에 두 번째 탭이
      첫 탭의 *낙관값*을 떠 두고, 마지막에 실행되는 되씌우기가 그 값을 복원한다.
      이 반례가 있어야 위 표가 "그냥 통과하는 테스트" 가 아니라는 것이 보인다.
    */
    const observer = new MutationObserver(queryClient, {
      mutationFn: () => Promise.reject(new Error("network down")),
      scope: { id: "post-like-snapshot" },
      retry: false,
      onMutate: () => {
        const prev = cachedPost(queryClient, "snapshot")
        patchPostInFeedCaches(queryClient, "snapshot", toggledLike)
        return { liked: prev.liked, likes: prev.likes }
      },
      onError: (_error, _variables, context) => {
        patchPostInFeedCaches(queryClient, "snapshot", (p) => ({
          ...p,
          ...context,
        }))
      },
    })

    await Promise.all([
      observer.mutate().catch(() => {}),
      observer.mutate().catch(() => {}),
    ])

    expect(cachedPost(queryClient, "snapshot")).toMatchObject({
      liked: true,
      likes: 11,
    })
  })

  it("상세의 글 단위 스코프는 같은 글의 요청을 직렬화한다", async () => {
    const queryClient = likedClient("serialized")
    const { observer, settle } = deferredToggle(queryClient, {
      postId: "serialized",
      serialize: true,
    })

    void observer.mutate().catch(() => {})
    void observer.mutate().catch(() => {})
    await tick()

    // 두 번째 요청은 아직 나가지 않았다(스코프 큐에서 대기).
    expect(settle).toHaveLength(1)

    settle[0].resolve({ liked: true, likes: 11 })
    await tick()
    expect(settle).toHaveLength(2)
    settle[1].resolve({ liked: false, likes: 10 })
    await tick()
    expect(cachedPost(queryClient, "serialized")).toMatchObject({
      liked: false,
      likes: 10,
    })
  })

  it("순번 등록부는 훅 두 개가 **한 벌**을 쓴다 — 종류·글마다 레인이 갈린다", () => {
    const lane = (kind: ToggleKind, postId: string) => {
      const turn = beginToggle(kind, postId, () => {})
      endToggle(turn)
      return turn
    }
    // 같은 글이라도 종류가 다르면 다른 레인(서로의 확정값을 버리지 않는다).
    expect(lane("like", "x").lane).not.toBe(lane("bookmark", "x").lane)
    // 같은 종류라도 글이 다르면 다른 레인(다른 글은 서로를 기다리지도 덮지도 않는다).
    expect(lane("like", "x").lane).not.toBe(lane("like", "y").lane)
    // 정산이 끝나면 레인은 처음으로 돌아간다(세션 내내 자라지 않는다).
    expect(lane("like", "z").version).toBe(1)
    expect(lane("like", "z").version).toBe(1)
  })
})

/** 마이크로태스크·타이머 한 바퀴. 옵저버가 상태를 흘려보낼 시간을 준다. */
function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

async function waitUntil(predicate: () => boolean) {
  for (let i = 0; i < 200; i += 1) {
    if (predicate()) return
    await tick()
  }
  throw new Error("조건이 만족되지 않았다")
}

describe("무한 피드 — 꼬리 실패와 재조회 범위", () => {
  const feedKey = [...POSTS_KEY, { tag: null, category: null, sort: "recent" }]

  /** 페이지를 무한히 주는 피드. `failFrom` 번째 요청부터 실패한다. */
  function feedObserver(
    queryClient: QueryClient,
    options: { failFrom?: number } = {},
  ) {
    const calls = { count: 0 }
    const observer = new InfiniteQueryObserver(queryClient, {
      queryKey: feedKey,
      queryFn: ({ pageParam }) => {
        calls.count += 1
        if (options.failFrom && calls.count >= options.failFrom) {
          return Promise.reject(new Error("next page down"))
        }
        const index = Number(pageParam ?? 0)
        return Promise.resolve({
          posts: [post(`p${index}`)],
          nextCursor: String(index + 1),
        })
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      retry: false,
    })
    const unsubscribe = observer.subscribe(() => {})
    return { observer, calls, unsubscribe }
  }

  it("다음 페이지가 실패해도 목록은 살아 있다 — isFetchNextPageError 로만 보인다", async () => {
    const queryClient = new QueryClient()
    const { observer, unsubscribe } = feedObserver(queryClient, { failFrom: 2 })
    await waitUntil(() => observer.getCurrentResult().data?.pages.length === 1)

    await observer.fetchNextPage().catch(() => {})

    const result = observer.getCurrentResult()
    // 받아 둔 1페이지는 그대로다 → 전면 오류 화면을 그리면 멀쩡한 목록을 지운다.
    expect(result.data?.pages).toHaveLength(1)
    expect(result.isFetchNextPageError).toBe(true)
    // 다음 커서는 여전히 살아 있다 → "글이 없어요" 도 거짓말이다.
    expect(result.hasNextPage).toBe(true)
    expect(result.isFetchingNextPage).toBe(false)
    unsubscribe()
  })

  it("상세 스코프는 더 이상 피드 페이지를 재조회하지 않는다", async () => {
    const queryClient = new QueryClient()
    const { observer, calls, unsubscribe } = feedObserver(queryClient)
    await waitUntil(() => observer.getCurrentResult().data?.pages.length === 1)
    await observer.fetchNextPage()
    await observer.fetchNextPage()
    expect(observer.getCurrentResult().data?.pages).toHaveLength(3)

    calls.count = 0
    await Promise.all(
      COMMUNITY_POST_REFRESH.map((queryKey) =>
        queryClient.refetchQueries({ queryKey, type: "active" }),
      ),
    )
    expect(calls.count).toBe(0)

    // 대조군 — 스코프에 피드 키가 있으면 **들고 있는 페이지 수만큼** 요청이 나간다.
    await queryClient.refetchQueries({ queryKey: POSTS_KEY, type: "active" })
    expect(calls.count).toBe(3)
    unsubscribe()
  })

  it("콜드 스타트의 첫 장이 실패해도 재시도 한 번으로 되살아난다", async () => {
    /*
      상세 화면의 "작성자의 다른 글" 은 이 쿼리 하나에서 나온다(`observe:"cold-only"`).
      실패하면 후보가 0개 — 예전에는 섹션이 흔적 없이 사라졌고, 재시도 2회 뒤 포기하고,
      복귀 재조회도 없고, 상세의 새로고침 스코프에는 피드가 빠져 있어서 화면이 살아
      있는 내내 그대로였다. 이제 화면이 재시도를 주고, 그 재시도는 실제로 복구된다.
    */
    const queryClient = new QueryClient()
    let down = true
    const observer = new InfiniteQueryObserver(queryClient, {
      queryKey: feedKey,
      queryFn: () =>
        down
          ? Promise.reject(new Error("feed down"))
          : Promise.resolve({ posts: [post("p0")], nextCursor: null }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      retry: false,
    })
    const unsubscribe = observer.subscribe(() => {})
    await waitUntil(() => observer.getCurrentResult().isError)

    // 실패한 채로는 후보가 0개다 — 섹션을 지우는 대신 이 사실을 화면이 말한다.
    expect(flattenFeedPages(observer.getCurrentResult().data)).toEqual([])

    down = false
    await observer.refetch()

    expect(
      flattenFeedPages(observer.getCurrentResult().data).map((p) => p.id),
    ).toEqual(["p0"])
    expect(observer.getCurrentResult().isError).toBe(false)
    unsubscribe()
  })

  it("정산의 기본 무효화는 피드를 재조회하지 않는다(낡음 표시만)", async () => {
    const queryClient = new QueryClient()
    const { observer, calls, unsubscribe } = feedObserver(queryClient)
    await waitUntil(() => observer.getCurrentResult().data?.pages.length === 1)
    await observer.fetchNextPage()
    await observer.fetchNextPage()

    calls.count = 0
    // 글쓰기·수정·좋아요 정산이 쓰는 그 호출(기본 refetchType "none").
    invalidateFeedCaches(queryClient)
    await tick()
    expect(calls.count).toBe(0)
    expect(queryClient.getQueryState(feedKey)?.isInvalidated).toBe(true)

    // 대조군 — 삭제 실패처럼 서버 진실로 되돌려야 할 때만 쓰는 "active".
    invalidateFeedCaches(queryClient, "active")
    await waitUntil(() => calls.count === 3)
    unsubscribe()
  })
})

describe('"콜드" 판정은 기본 조합만 본다', () => {
  it("필터를 걸고 보던 사람은 캐시가 있어도 콜드다 — 상세에서 첫 장 하나가 나간다", () => {
    const queryClient = new QueryClient()
    // 사용자는 `category=diet` 를 세 장까지 스크롤했다.
    queryClient.setQueryData(
      communityFeedQueryKey({ category: "diet" }),
      pages([post("a")], [post("b")], [post("c")]),
    )

    /*
      상세(`src/features/recipe/views/PostDetailScreen.tsx`)는 이 훅을 **인자 없이** 부르므로 판정도 기본 조합으로
      한다. 관련글 선정이 읽는 캐시가 바로 그 기본 조합이라, 필터를 걸고 보던 사람에게는
      실제로 읽을 데이터가 없다 — 그래서 요청 한 번은 의도한 대가다.
    */
    expect(hasCachedFeedPages(queryClient, communityFeedQueryKey({}))).toBe(
      false,
    )
    expect(
      hasCachedFeedPages(
        queryClient,
        communityFeedQueryKey({ category: "diet" }),
      ),
    ).toBe(true)
  })
})

describe("보관함은 피드의 기본 조합과 같은 쿼리다", () => {
  it("인자 없는 호출과 피드 기본 상태의 키가 해시까지 같다", () => {
    // `src/features/recipe/views/CommunityLibraryScreen.tsx` 의 `useCommunityPosts()`
    const libraryKey = communityFeedQueryKey({})
    // `FreePostTab` 의 기본 상태(tagFilter=null, category=null, sort="recent")
    const feedDefaultKey = communityFeedQueryKey({
      tag: null,
      category: null,
      sort: "recent",
    })
    /*
      같다 = 피드에서 당겨 1페이지로 자르면 **보관함의 데이터 원천도 같이 잘린다**.
      `trimFeedCacheToFirstPage` 머리말의 "기본 조합은 분리되지 않는다" 가 이 사실이고,
      주석이 다시 "정확 키라서 보관함은 안전하다" 로 돌아가면 이 테스트가 맥락을 준다.
    */
    expect(hashKey([...libraryKey])).toBe(hashKey([...feedDefaultKey]))
  })
})
