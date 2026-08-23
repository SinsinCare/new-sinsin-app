/**
 * 무한 목록 꼬리의 두 규칙(`useInfiniteTail`) — **훅 본문 자체를** 돌린다.
 *
 * 1. **다음 페이지 실패는 낙관 패치에 지워지면 안 된다.**
 *    옵저버의 `isFetchNextPageError` 는 쿼리 status 에서 파생되는데, 이 계보는
 *    좋아요·북마크·조회수 기록이 전부 `setQueryData` 로 캐시를 만진다.
 *    `setQueryData` 는 `success` 를 디스패치하므로 status 가 error → success 로
 *    돌아가고 꼬리의 실패 행이 조용히 사라진다(아래 반례가 그것을 실물 옵저버로 찍는다).
 *    그러면 사용자에게는 목록이 **그냥 거기서 끝난 것**으로 보인다.
 *
 *    **오류 객체도 같이** 들고 있어야 한다. 사실만 옮기고 문구를 옵저버의 `error` 에서
 *    읽으면 같은 캐시 쓰기가 그 `error` 를 null 로 만들어, 500 이라고 말하던 줄이
 *    하트 한 번에 일반 문구로 주저앉는다(아래 반례가 그 두 상태를 나란히 찍는다).
 *
 * 2. **빈 목록 자동 backfill 에는 예산이 있다.**
 *    상한이 없으면 사람이 끼어들 자리 없이 커서가 끝날 때까지 페이지가 넘어간다.
 *    예산은 필터 조합(쿼리 키)에 매이고, 조합이 바뀌거나 새로고침하면 처음으로 돌아간다.
 *    그 초기화는 **저장돼야 한다** — 읽을 때만 갈아치우면 조합을 다녀오는 것만으로
 *    옛 실패와 다 쓴 예산이 되살아난다(그러면 스크롤로도 재시도할 수 없다).
 *
 * 3. **취소로 아무 것도 못 받고 끝난 요청도 사실이다.**
 *    좋아요·북마크·삭제는 낙관 갱신 전에 계보 전체를 취소한다 — 그 취소가 진행 중이던
 *    다음-페이지 요청을 함께 접으면 결과는 실패가 아니고(장수 그대로, `hasNextPage`
 *    는 살아 있다), 로더도 실패 행도 없고 `onEndReached` 는 다시 안 쏜다.
 *    사용자는 **조용히 잘린 목록** 앞에 남는다.
 *
 * 4. **늦게 도착한 결과는 자기 세대의 것일 때만 사실이다.**
 *    다음 장이 떠 있는 동안 사용자는 칩을 눌러 조합을 바꾸거나 당겨서 새로고침한다.
 *    그때 도착한 옛 결과가 지금 조합의 꼬리를 지우면(실패 행이 사라지고 예산이
 *    되살아나면) 3번이 막으려던 "조용히 잘린 목록" 과 2번의 상한이 함께 무너진다.
 *    그래서 기록 콜백은 **자기 키가 아직 화면의 키일 때만** 쓰고, 요청은 세대 번호를
 *    들고 나가 돌아왔을 때 세대가 그대로일 때만 기록한다.
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

// 훅 4개(useState/useRef/useCallback/useMemo)만 갈아 끼워 훅 본문을 돌린다
// (렌더러가 없는 이유는 `tests/helpers/hookHarness.ts` 머리말). 그 하네스는 **렌더 중
// setState 로 다시 렌더하고 useCallback 의 의존성을 본다** — 둘 중 하나라도 어긋나면
// 아래 "늦게 도착한 옛 조합의 결과" 는 구조적으로 재현되지 않는다(그 머리말 2번).
jest.mock("react", () => {
  const actual = jest.requireActual("react")
  const harness = jest.requireActual("./helpers/hookHarness")
  return {
    ...actual,
    useState: harness.useState,
    useRef: harness.useRef,
    useCallback: harness.useCallback,
    useMemo: harness.useMemo,
  }
})

import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query"

import {
  MAX_AUTO_BACKFILL_PAGES,
  fetchNextTailPage,
  useInfiniteTail,
  type TailFetchOutcome,
} from "@/src/features/recipe/hooks/useInfiniteTail"
import {
  POSTS_KEY,
  cancelFeedCacheQueries,
  type CommunityFeedData,
} from "@/src/features/recipe/hooks/communityFeedCache"
import type { CommunityMealPost } from "@/src/features/recipe/types"
import {
  renderHookSync,
  useState as harnessUseState,
} from "./helpers/hookHarness"

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

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

async function waitUntil(predicate: () => boolean) {
  for (let i = 0; i < 200; i += 1) {
    if (predicate()) return
    await tick()
  }
  throw new Error("조건이 만족되지 않았다")
}

const feedKey = (sort: string) => [
  ...POSTS_KEY,
  { tag: null, category: null, sort },
]

/** 정렬을 바꿔 **쿼리 키가 바뀌는** 상황을 훅 안에서 재현한다(필터·태그도 같은 축). */
function mountWithSort() {
  return renderHookSync(() => {
    const [sort, setSort] = harnessUseState("recent")
    return { ...useInfiniteTail(feedKey(sort)), setSort }
  })
}

describe("꼬리 실패는 훅이 기억한다 — 낙관 패치가 지우지 못한다", () => {
  it("옵저버 플래그는 setQueryData 한 번에 지워진다 (반례 · 실물 옵저버)", async () => {
    const queryClient = new QueryClient()
    const key = feedKey("recent")
    let calls = 0
    const observer = new InfiniteQueryObserver(queryClient, {
      queryKey: key,
      queryFn: ({ pageParam }) => {
        calls += 1
        if (calls >= 2) return Promise.reject(new Error("next page down"))
        const index = Number(pageParam ?? 0)
        return Promise.resolve({
          posts: [post(`p${index}`)],
          nextCursor: String(index + 1),
        })
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      retry: false,
    })
    const unsubscribe = observer.subscribe(() => {})
    await waitUntil(() => observer.getCurrentResult().data?.pages.length === 1)

    await observer.fetchNextPage().catch(() => {})
    expect(observer.getCurrentResult().isFetchNextPageError).toBe(true)

    /*
      글을 하나 열기만 해도 도는 패치(`recordPostView` → `patchPostInFeedCaches`)와
      같은 종류의 캐시 쓰기. 이 한 줄로 옵저버 플래그가 꺼진다.
    */
    queryClient.setQueryData(key, (old) => old)
    await tick()
    expect(observer.getCurrentResult().isFetchNextPageError).toBe(false)
    unsubscribe()
  })

  it("훅이 기억한 실패는 같은 캐시 쓰기에도 남는다", () => {
    const hook = renderHookSync(() => useInfiniteTail(feedKey("recent")))
    expect(hook.result().isTailError).toBe(false)

    hook.result().markTailResult(true)
    expect(hook.result().isTailError).toBe(true)

    // 캐시를 아무리 만져도 이 상태는 쿼리 status 에서 파생되지 않는다.
    const queryClient = new QueryClient()
    queryClient.setQueryData(feedKey("recent"), { pages: [], pageParams: [] })
    expect(hook.result().isTailError).toBe(true)
  })

  it("성공한 다음 페이지가 실패 표시를 지운다", () => {
    const hook = renderHookSync(() => useInfiniteTail(feedKey("recent")))
    hook.result().markTailResult(true)
    hook.result().markTailResult(false)
    expect(hook.result().isTailError).toBe(false)
  })

  it("재조회(resetTail)는 실패 표시를 지운다", () => {
    const hook = renderHookSync(() => useInfiniteTail(feedKey("recent")))
    hook.result().markTailResult(true)
    hook.result().resetTail()
    expect(hook.result().isTailError).toBe(false)
  })

  it("필터를 바꾸면 옛 조합의 실패는 따라오지 않는다", () => {
    const hook = mountWithSort()
    hook.result().markTailResult(true)
    expect(hook.result().isTailError).toBe(true)

    hook.result().setSort("popular")
    expect(hook.result().isTailError).toBe(false)
  })

  it("실패의 원인도 함께 기억한다 — 옵저버의 error 는 캐시 쓰기에 지워진다(반례)", async () => {
    const queryClient = new QueryClient()
    const key = feedKey("recent")
    let calls = 0
    const observer = new InfiniteQueryObserver(queryClient, {
      queryKey: key,
      queryFn: ({ pageParam }) => {
        calls += 1
        if (calls >= 2) return Promise.reject(new Error("서버 오류 500"))
        const index = Number(pageParam ?? 0)
        return Promise.resolve({
          posts: [post(`p${index}`)],
          nextCursor: String(index + 1),
        })
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      retry: false,
    })
    const unsubscribe = observer.subscribe(() => {})
    await waitUntil(() => observer.getCurrentResult().data?.pages.length === 1)
    await observer.fetchNextPage().catch(() => {})

    const cause = observer.getCurrentResult().error
    expect(cause).toBeInstanceOf(Error)

    const hook = renderHookSync(() => useInfiniteTail(key))
    hook.result().markTailResult(true, cause)

    // 하트 한 번(= `patchPostInFeedCaches`) 과 같은 종류의 캐시 쓰기.
    queryClient.setQueryData(key, (old) => old)
    await tick()

    // 옵저버는 원인을 잃었다 — 여기서 문구를 고르면 "지금은 이 작업을 …" 로 주저앉는다.
    expect(observer.getCurrentResult().error).toBeNull()
    // 훅은 그대로 들고 있다 — 꼬리는 여전히 500 을 말한다.
    expect(hook.result().tailError).toBe(cause)
    unsubscribe()
  })

  it("성공한 다음 페이지는 원인도 함께 지운다", () => {
    const hook = renderHookSync(() => useInfiniteTail(feedKey("recent")))
    hook.result().markTailResult(true, new Error("서버 오류 500"))
    expect(hook.result().tailError).toBeInstanceOf(Error)

    hook.result().markTailResult(false)
    expect(hook.result().tailError).toBeUndefined()
  })
})

describe("자동 backfill 예산", () => {
  it(`조합당 ${MAX_AUTO_BACKFILL_PAGES} 장까지만 자동이다`, () => {
    const hook = renderHookSync(() => useInfiniteTail(feedKey("recent")))
    for (let i = 0; i < MAX_AUTO_BACKFILL_PAGES; i += 1) {
      expect(hook.result().canAutoBackfill).toBe(true)
      hook.result().noteAutoBackfill()
    }
    // 예산이 끝났다 → 화면은 자동 페이징을 멈추고 "더 보기" 를 세운다.
    expect(hook.result().canAutoBackfill).toBe(false)
  })

  it("필터 조합이 바뀌면 예산이 처음으로 돌아간다", () => {
    const hook = mountWithSort()
    for (let i = 0; i < MAX_AUTO_BACKFILL_PAGES; i += 1) {
      hook.result().noteAutoBackfill()
    }
    expect(hook.result().canAutoBackfill).toBe(false)

    hook.result().setSort("views")
    expect(hook.result().canAutoBackfill).toBe(true)
  })

  it("당김 새로고침(resetTail)도 예산을 되돌린다", () => {
    const hook = renderHookSync(() => useInfiniteTail(feedKey("recent")))
    for (let i = 0; i < MAX_AUTO_BACKFILL_PAGES; i += 1) {
      hook.result().noteAutoBackfill()
    }
    expect(hook.result().canAutoBackfill).toBe(false)
    hook.result().resetTail()
    expect(hook.result().canAutoBackfill).toBe(true)
  })
})

describe("조합 초기화는 **저장된다** — 돌아와도 되살아나지 않는다", () => {
  it("A(실패 · 예산 0) → B → A 로 돌아와도 A 는 처음 상태다", () => {
    const hook = mountWithSort()
    hook.result().markTailResult(true, new Error("next page down"))
    for (let i = 0; i < MAX_AUTO_BACKFILL_PAGES; i += 1) {
      hook.result().noteAutoBackfill()
    }
    expect(hook.result().isTailError).toBe(true)
    expect(hook.result().canAutoBackfill).toBe(false)

    // 다른 조합으로 갈아탄다 — 옛 조합의 사실은 여기서 뜻이 없다.
    hook.result().setSort("popular")
    expect(hook.result().isTailError).toBe(false)
    expect(hook.result().canAutoBackfill).toBe(true)

    /*
      **돌아온다.** 읽을 때만 초기값으로 갈아치우던 시절에는 저장된 상태가 여전히
      옛 조합의 것이라, 키가 다시 같아지는 순간 실패와 다 쓴 예산이 그대로 되살아났다
      (새로 시도한 적도 없는데). 그러면 `handleEndReached` 가 막혀 스크롤로도
      재시도할 수 없다.
    */
    hook.result().setSort("recent")
    expect(hook.result().isTailError).toBe(false)
    expect(hook.result().tailError).toBeUndefined()
    expect(hook.result().canAutoBackfill).toBe(true)
  })

  it("돌아온 뒤의 기록은 그 조합에 다시 쌓인다", () => {
    const hook = mountWithSort()
    hook.result().markTailResult(true)
    hook.result().setSort("popular")
    hook.result().setSort("recent")

    hook.result().markTailResult(true)
    expect(hook.result().isTailError).toBe(true)
    hook.result().markTailResult(false)
    expect(hook.result().isTailError).toBe(false)
  })
})

/**
 * 늦게 도착한 **옛 조합**의 결과가 지금 조합의 꼬리를 지우던 자리(머리말 4).
 *
 * 실측 경로: 최신 정렬에서 끝까지 스크롤해 2페이지가 느린 회선에 떠 있는 동안 인기
 * 칩을 누른다 → 인기에서 다음 장이 실패해 실패 행이 선다 → 그제서야 최신의 옛 요청이
 * 끝난다 → **실패 행이 사라지고** `handleEndReached` 가 다시 열린다(= 3번이 막으려던
 * 조용히 잘린 목록). 예산 쪽도 같은 뿌리로 무너진다.
 *
 * 기록 콜백은 만들어질 때의 키를 닫고 있다 — 그래서 옛 렌더의 콜백을 **그대로 잡아 두고**
 * 나중에 부른다(하네스의 `useCallback` 이 의존성을 보기 때문에 잡을 수 있다).
 */
describe("늦게 도착한 옛 조합의 결과 — 지금 조합을 지우지 못한다", () => {
  it("옛 조합의 결과가 지금 조합의 실패 행을 지우지 못한다", () => {
    const hook = mountWithSort()
    // 최신(A)에서 다음 장을 요청하며 잡힌 기록 콜백.
    const settleOldSort = hook.result().markTailResult
    hook.result().setSort("popular")

    // 인기(B)에서 다음 장이 실패했다 — 꼬리에 실패 행이 섰다.
    hook.result().markTailResult(true, new Error("next page down"))
    expect(hook.result().isTailError).toBe(true)

    // 이제서야 최신(A)의 요청이 끝난다.
    settleOldSort(false)

    expect(hook.result().isTailError).toBe(true)
    expect(hook.result().tailError).toBeInstanceOf(Error)
  })

  it("옛 조합의 결과가 지금 조합의 '더 보기'(정체)를 지우지 못한다", () => {
    const hook = mountWithSort()
    const settleOldSort = hook.result().markTailResult
    hook.result().setSort("popular")

    // 인기(B)에서 좋아요의 취소가 다음 장을 접었다 — 꼬리에 "더 보기" 가 섰다.
    hook.result().markTailStalled()
    expect(hook.result().isTailStalled).toBe(true)

    settleOldSort(false)

    // 그 줄이 사라지면 사용자는 조용히 잘린 목록 앞에 남는다.
    expect(hook.result().isTailStalled).toBe(true)
  })

  it("옛 조합의 결과가 다 쓴 backfill 예산을 되살리지 못한다", () => {
    const hook = mountWithSort()
    const settleOldSort = hook.result().markTailResult
    hook.result().setSort("popular")

    for (let i = 0; i < MAX_AUTO_BACKFILL_PAGES; i += 1) {
      hook.result().noteAutoBackfill()
    }
    expect(hook.result().canAutoBackfill).toBe(false)

    settleOldSort(false)

    // 되살아나면 사용자가 고르지 않은 요청이 상한을 넘어 세 장 더 나간다.
    expect(hook.result().canAutoBackfill).toBe(false)
  })

  it("옛 조합의 정체 표시도 지금 조합에 붙지 않는다", () => {
    const hook = mountWithSort()
    const stallOldSort = hook.result().markTailStalled
    hook.result().setSort("popular")

    stallOldSort()

    // 인기(B)는 다음 장을 요청한 적도 없다 — "더 보기" 는 거짓말이다.
    expect(hook.result().isTailStalled).toBe(false)
  })

  it("조합이 바뀐 뒤 도착한 다음-페이지 결과는 아예 기록되지 않는다(세대 판정)", async () => {
    const hook = mountWithSort()
    let release: ((outcome: TailFetchOutcome) => void) | null = null
    const pending = fetchNextTailPage({
      fetchNextPage: () =>
        new Promise<TailFetchOutcome>((resolve) => {
          release = resolve
        }),
      pageCount: () => 1,
      tailEpoch: hook.result().tailEpoch,
      markTailResult: hook.result().markTailResult,
      markTailStalled: hook.result().markTailStalled,
    })
    await waitUntil(() => release !== null)

    // 요청이 떠 있는 동안 조합을 바꾼다.
    hook.result().setSort("popular")
    release!({
      isError: true,
      error: new Error("옛 조합 실패"),
      hasNextPage: true,
    })
    await pending

    expect(hook.result().isTailError).toBe(false)
    expect(hook.result().isTailStalled).toBe(false)
  })
})

describe("취소로 접힌 다음 장 — 실패가 아니라 '정체' 다", () => {
  const key = feedKey("recent")
  const pageCountOf = (queryClient: QueryClient) =>
    queryClient.getQueryData<CommunityFeedData>(key)?.pages.length ?? 0

  /** 첫 장은 즉시, **두 번째 요청만** 마개를 열어 줄 때까지 떠 있는 피드. */
  function stallableFeed(queryClient: QueryClient) {
    let release: (() => void) | null = null
    const observer = new InfiniteQueryObserver(queryClient, {
      queryKey: key,
      queryFn: async ({ pageParam }) => {
        const index = Number(pageParam ?? 0)
        if (index === 1 && release === null) {
          await new Promise<void>((resolve) => {
            release = resolve
          })
        }
        return {
          posts: [post(`p${index}`)],
          nextCursor: String(index + 1),
        }
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      retry: false,
    })
    const unsubscribe = observer.subscribe(() => {})
    return {
      observer,
      unsubscribe,
      isInFlight: () => release !== null,
      release: () => release?.(),
    }
  }

  it("좋아요의 계보 취소가 진행 중이던 다음 장을 접으면 '더 보기' 가 선다", async () => {
    const queryClient = new QueryClient()
    const feed = stallableFeed(queryClient)
    await waitUntil(
      () => feed.observer.getCurrentResult().data?.pages.length === 1,
    )

    const hook = renderHookSync(() => useInfiniteTail(key))
    const pending = fetchNextTailPage({
      fetchNextPage: () => feed.observer.fetchNextPage(),
      pageCount: () => pageCountOf(queryClient),
      tailEpoch: hook.result().tailEpoch,
      markTailResult: hook.result().markTailResult,
      markTailStalled: hook.result().markTailStalled,
    })
    await waitUntil(feed.isInFlight)

    // 하트 한 번 = 계보 전체 취소(`useCommunityPosts` 의 `onMutate`).
    await cancelFeedCacheQueries(queryClient)
    feed.release()
    await pending

    const result = feed.observer.getCurrentResult()
    // 실패가 아니다 — 실패 행을 세우면 거짓말이다.
    expect(result.isError).toBe(false)
    expect(hook.result().isTailError).toBe(false)
    // 장수는 그대로인데 다음 커서는 살아 있다 = 목록이 조용히 잘렸다.
    expect(result.data?.pages).toHaveLength(1)
    expect(result.hasNextPage).toBe(true)
    // 그래서 꼬리에 "더 보기" 를 세운다(사용자가 다시 고를 수 있는 자리).
    expect(hook.result().isTailStalled).toBe(true)
    feed.unsubscribe()
  })

  it("그 '더 보기' 를 누르면 실제로 다음 장이 온다 — 잘린 목록에 갇히지 않는다", async () => {
    const queryClient = new QueryClient()
    const feed = stallableFeed(queryClient)
    await waitUntil(
      () => feed.observer.getCurrentResult().data?.pages.length === 1,
    )
    const hook = renderHookSync(() => useInfiniteTail(key))
    const options = {
      fetchNextPage: () => feed.observer.fetchNextPage(),
      pageCount: () => pageCountOf(queryClient),
      tailEpoch: hook.result().tailEpoch,
      markTailResult: hook.result().markTailResult,
      markTailStalled: hook.result().markTailStalled,
    }

    const pending = fetchNextTailPage(options)
    await waitUntil(feed.isInFlight)
    await cancelFeedCacheQueries(queryClient)
    feed.release()
    await pending
    expect(hook.result().isTailStalled).toBe(true)

    // 사용자가 "더 보기" 를 누른다.
    await fetchNextTailPage(options)

    expect(feed.observer.getCurrentResult().data?.pages).toHaveLength(2)
    expect(hook.result().isTailStalled).toBe(false)
    expect(hook.result().isTailError).toBe(false)
    feed.unsubscribe()
  })

  /*
    같은 "취소" 라도 **당김 새로고침**이 접은 것은 정체가 아니다. `useRefreshable` 은
    `onBeforeRefresh` 에서 꼬리를 지우고(`resetTail`) `cancelRefetch: true` 로 날아가
    있던 요청을 버린 뒤 새로 보낸다. 그 접힌 결과는 좋아요의 취소와 **똑같은 모양**
    으로 온다(실패 아님 · 장수 그대로 · `hasNextPage` 살아 있음) — 세대를 안 보면
    방금 지운 자리에 "더 보기" 가 다시 서고, 사용자는 처음부터 다시 받는 중인 목록
    아래에서 "다음 장을 더 받겠냐" 는 질문을 받는다.
  */
  it("당김 새로고침이 접은 다음 장은 정체가 아니다 — 지운 자리에 '더 보기' 가 다시 서지 않는다", async () => {
    const queryClient = new QueryClient()
    const feed = stallableFeed(queryClient)
    await waitUntil(
      () => feed.observer.getCurrentResult().data?.pages.length === 1,
    )

    const hook = renderHookSync(() => useInfiniteTail(key))
    const pending = fetchNextTailPage({
      fetchNextPage: () => feed.observer.fetchNextPage(),
      pageCount: () => pageCountOf(queryClient),
      tailEpoch: hook.result().tailEpoch,
      markTailResult: hook.result().markTailResult,
      markTailStalled: hook.result().markTailStalled,
    })
    await waitUntil(feed.isInFlight)

    // 사용자가 당긴다 — `useRefreshable` 의 순서 그대로다.
    hook.result().resetTail()
    const refreshed = queryClient
      .refetchQueries(
        { queryKey: key, type: "active" },
        { throwOnError: true, cancelRefetch: true },
      )
      .catch(() => {})
    feed.release()
    await pending
    await refreshed

    expect(hook.result().isTailStalled).toBe(false)
    expect(hook.result().isTailError).toBe(false)
    // 목록은 여전히 이어 받을 수 있다(꼬리가 막지 않는다).
    expect(feed.observer.getCurrentResult().hasNextPage).toBe(true)
    feed.unsubscribe()
  })

  it("실패는 정체가 아니다 — 실패 행이 서고 원인이 남는다", async () => {
    const hook = renderHookSync(() => useInfiniteTail(key))
    const cause = new Error("next page down")
    await fetchNextTailPage({
      fetchNextPage: () =>
        Promise.resolve({ isError: true, error: cause, hasNextPage: true }),
      pageCount: () => 1,
      tailEpoch: hook.result().tailEpoch,
      markTailResult: hook.result().markTailResult,
      markTailStalled: hook.result().markTailStalled,
    })

    expect(hook.result().isTailError).toBe(true)
    expect(hook.result().tailError).toBe(cause)
    expect(hook.result().isTailStalled).toBe(false)
  })

  it("장이 실제로 붙었으면 정체가 아니다", async () => {
    const hook = renderHookSync(() => useInfiniteTail(key))
    let pages = 1
    await fetchNextTailPage({
      fetchNextPage: () => {
        pages += 1
        return Promise.resolve({
          isError: false,
          error: null,
          hasNextPage: true,
        })
      },
      pageCount: () => pages,
      tailEpoch: hook.result().tailEpoch,
      markTailResult: hook.result().markTailResult,
      markTailStalled: hook.result().markTailStalled,
    })

    expect(hook.result().isTailStalled).toBe(false)
    expect(hook.result().isTailError).toBe(false)
  })

  it("마지막 장이면(다음 커서 없음) 장수가 그대로여도 정체가 아니다", async () => {
    const hook = renderHookSync(() => useInfiniteTail(key))
    await fetchNextTailPage({
      fetchNextPage: () =>
        Promise.resolve({ isError: false, error: null, hasNextPage: false }),
      pageCount: () => 1,
      tailEpoch: hook.result().tailEpoch,
      markTailResult: hook.result().markTailResult,
      markTailStalled: hook.result().markTailStalled,
    })

    // 더 받을 것이 없으면 "더 보기" 는 거짓말이다 — 빈 문구 쪽이 맡는다.
    expect(hook.result().isTailStalled).toBe(false)
  })
})
