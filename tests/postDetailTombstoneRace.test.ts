/**
 * **지운 글이 되살아나던 창.** (2026-08-21)
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 무엇이 문제였나
 *
 * 상세 쿼리는 서버가 "이 글은 없다"(`COMMUNITY_ERROR_001`·404) 라고 말한 그 자리에서
 * 계보(피드·검색·인기)의 그 글을 **파괴적으로** 지운다. 그런데 지우기만 하고
 * **날아가 있는 다음-페이지 요청을 접지 않았다.**
 *
 * query-core 의 무한 쿼리 동작은 가져오기가 **시작될 때** 페이지 배열을 닫는다
 * (`infiniteQueryBehavior`: `const oldPages = context.state.data?.pages || []`).
 * 그래서 그 사이에 `setQueryData` 로 한 줄을 빼도, 응답이 도착하는 순간 캐시는
 * `oldPages + newPage` 로 덮어써진다 — 방금 지운 글이 그대로 돌아온다.
 *
 * 사용자 경로: 느린 회선에서 피드를 스크롤해 다음 장이 날아가 있는 동안 글을 연다 →
 * 404 → 뒤로 가면 그 글이 목록에 **다시 서 있고**, 누르면 또 묘비가 열린다.
 *
 * 삭제 경로는 이미 취소를 먼저 한다(`useCommunityPosts` 의 `deletePostMutation`).
 * 404 는 "남이 지운 글" 이라 결과가 같아야 하는데 여기만 빠져 있었다.
 *
 * ■ 어떻게 재는가
 *
 * **진짜 query-core 로 잰다.** 실제 `InfiniteQueryObserver` 를 붙이고 2페이지를
 * 손으로 붙잡아 둔 채(deferred) 두 가지 순서를 나란히 돌린다:
 *   - 취소 없이 지우기(옛 방식) → 되살아나는지,
 *   - `forgetMissingPost`(지금) → 지워진 채로 남는지.
 * 화면을 그릴 방법은 이 저장소에 없으므로(RN 렌더러 없음) 상세 훅의 배선은 마지막에
 * **주석을 걷어낸 소스**로 확인한다.
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

import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query"

import {
  POSTS_KEY,
  flattenFeedPages,
  removePostFromFeedCaches,
  type CommunityFeedData,
} from "@/src/features/recipe/hooks/communityFeedCache"
import { forgetMissingPost } from "@/src/features/recipe/hooks/usePostDetail"
import type {
  CommunityMealPost,
  CommunityPostsPage,
} from "@/src/features/recipe/types"

const FEED_KEY = [...POSTS_KEY, { tag: null, category: null, sort: "recent" }]

function post(id: string): CommunityMealPost {
  return {
    id,
    authorId: Number(id),
    authorName: `글쓴이${id}`,
    authorRole: "user",
    category: "daily",
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
  }
}

/** 캐시에 남은 글 id — 화면이 그리는 것과 같은 평탄화를 지난다. */
function cachedIds(client: QueryClient): string[] {
  return flattenFeedPages(client.getQueryData<CommunityFeedData>(FEED_KEY)).map(
    (item) => item.id,
  )
}

interface Race {
  client: QueryClient
  /** 붙잡아 둔 2페이지를 놓아 준다. */
  releasePage2: () => void
  /** 옵저버 구독 해제 + 2페이지 요청의 결말을 기다린다. */
  settle: () => Promise<void>
}

/**
 * 1페이지(`["1","2"]`)를 받아 둔 피드에 **2페이지를 날려 둔 상태**를 만든다.
 * 반환 직후가 "다음 장이 아직 안 온" 그 창이다.
 */
async function feedWithPageTwoInFlight(): Promise<Race> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })

  let release: (() => void) | null = null
  const page2 = new Promise<CommunityPostsPage>((resolve) => {
    release = () => resolve({ posts: [post("3")], nextCursor: null })
  })

  const observer = new InfiniteQueryObserver(client, {
    queryKey: FEED_KEY,
    queryFn: ({ pageParam }) =>
      pageParam === undefined
        ? Promise.resolve({
            posts: [post("1"), post("2")],
            nextCursor: "cursor-2",
          })
        : page2,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })

  const unsubscribe = observer.subscribe(() => {})
  // 1페이지를 실제로 받는다 — 여기까지가 "글 목록을 보고 있다".
  await observer.refetch()
  expect(cachedIds(client)).toEqual(["1", "2"])

  // 2페이지를 쏘고 **붙잡아 둔다**. 이 프라미스는 아직 아무에게도 안 왔다.
  const pending = observer.fetchNextPage().catch(() => undefined)
  await Promise.resolve()

  return {
    client,
    releasePage2: () => release?.(),
    settle: async () => {
      await pending
      unsubscribe()
    },
  }
}

describe("404 로 지운 글은 날아가 있던 페이지와 함께 돌아오지 않는다", () => {
  it("**취소 없이** 지우면 다음 장 응답이 그 글을 도로 넣는다 (반례 — 옛 동작)", async () => {
    const { client, releasePage2, settle } = await feedWithPageTwoInFlight()

    // 옛 404 갈래가 하던 일 그대로.
    removePostFromFeedCaches(client, "1")
    expect(cachedIds(client)).toEqual(["2"])

    releasePage2()
    await settle()

    /*
      가져오기가 시작될 때 닫아 둔 `oldPages`(["1","2"]) 위에 새 장이 붙는다.
      지운 글이 목록 한가운데로 되돌아왔다 — 열면 또 묘비다.
    */
    expect(cachedIds(client)).toEqual(["1", "2", "3"])
  })

  it("`forgetMissingPost` 는 먼저 접고 지운다 — 지워진 채로 남는다", async () => {
    const { client, releasePage2, settle } = await feedWithPageTwoInFlight()

    await forgetMissingPost(client, "1")
    expect(cachedIds(client)).toEqual(["2"])

    releasePage2()
    await settle()

    // 취소된 요청의 응답은 아무 것도 되살리지 못한다.
    expect(cachedIds(client)).toEqual(["2"])
  })

  it("취소의 **되돌리기**가 방금 지운 글을 복구하지 않는다 (query-core 실측)", async () => {
    /*
      `cancelQueries` 의 기본값은 `revert: true` — 가져오기 직전 상태로 **되돌린다.**
      그대로라면 취소가 지우기를 무효로 만들 수도 있었다. 실제로는 안 그렇다:
      `setQueryData` 는 `manual` 성공으로 디스패치되고 query-core 는 그때
      `#revertState` 를 **새 상태로 갈아 끼운다**(`query.js`: `this.#revertState =
      action.manual ? newState : void 0`). 그래서 되돌리기의 종착지가 "지운 뒤" 다.

      이걸 못 박아 두는 이유: 이 성질이 바뀌면 위의 수정이 **조용히** 원상태로
      돌아간다(지웠는데 취소가 되살린다). 두 순서 다 같은 답이라는 것도 같이 적는다 —
      `await` 는 순서를 위한 것이 아니라 "접힌 뒤에 지운다" 는 뜻을 위한 것이다.
    */
    for (const order of ["cancel-first", "remove-first"] as const) {
      const { client, releasePage2, settle } = await feedWithPageTwoInFlight()
      if (order === "cancel-first") {
        await client.cancelQueries({ queryKey: POSTS_KEY })
        removePostFromFeedCaches(client, "1")
      } else {
        removePostFromFeedCaches(client, "1")
        await client.cancelQueries({ queryKey: POSTS_KEY })
      }
      releasePage2()
      await settle()
      expect(cachedIds(client)).toEqual(["2"])
    }
  })

  it("계보 전부를 접는다 — 검색·인기까지 (`cancelFeedCacheQueries` 범위)", async () => {
    const { client, releasePage2, settle } = await feedWithPageTwoInFlight()
    const cancelled: unknown[][] = []
    const original = client.cancelQueries.bind(client)
    jest
      .spyOn(client, "cancelQueries")
      .mockImplementation((filters?: Parameters<typeof original>[0]) => {
        cancelled.push([...((filters?.queryKey ?? []) as unknown[])])
        return original(filters)
      })

    await forgetMissingPost(client, "1")
    releasePage2()
    await settle()

    expect(cancelled).toEqual([
      ["community-posts"],
      ["community-post-search"],
      ["community-popular"],
    ])
  })
})

describe("상세 훅의 404 갈래가 그 순서를 쓴다", () => {
  const source = readFileSync(
    join(__dirname, "../src/features/recipe/hooks/usePostDetail.ts"),
    "utf8",
  )
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/^\s*\/\/.*$/gmu, "")

  /**
   * 상세 쿼리의 `queryFn` **본문만** 본다. 파일 전체를 보면 `forgetMissingPost` 의
   * 정의(그 안에 `removePostFromFeedCaches` 가 있다)가 검사를 통과시켜 버린다 —
   * 우리가 재려는 것은 "404 갈래가 무엇을 부르는가" 하나다.
   */
  const queryFnBody = source.slice(
    source.indexOf("queryFn: async () => {"),
    source.indexOf("initialData:"),
  )

  it("`forgetMissingPost` 를 **기다린다** — 취소 없이 지우던 자리", () => {
    expect(queryFnBody).toContain(
      "await forgetMissingPost(queryClient, postId)",
    )
    // 취소를 건너뛰는 옛 호출이 이 갈래에 한 줄이라도 남으면 창이 다시 열린다.
    expect(queryFnBody).not.toMatch(/removePostFromFeedCaches\(/u)
  })

  it("그 갈래는 여전히 **없는 글일 때만** 돈다 — 회선이 끊겼다고 지우지 않는다", () => {
    expect(queryFnBody).toContain("if (isMissingPostError(fetchError))")
    expect(queryFnBody).toContain("throw fetchError")
  })
})
