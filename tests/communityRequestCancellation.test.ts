/**
 * **취소가 진짜 취소인가** — 검색·인기 목록.
 *
 * `communityPostService` 는 `getPosts`/`searchPosts`/`getPopularPosts` 셋 다
 * `AbortSignal` 을 받는다. 그런데 훅이 그것을 **안 넘기면** react-query 의
 * `cancelQueries`(좋아요·북마크·삭제의 낙관 갱신 직전)와 검색어 교체는
 * **프라미스만 떼어 놓는다** — HTTP 요청은 소켓이 열린 채 끝까지 가고, 받아 온 페이지는
 * 아무도 안 읽는 채로 버려진다. 회선이 느릴수록 사용자가 낸 데이터 요금 그대로다.
 * 피드(`useCommunityPosts`)는 넘기고 있었고, 검색·인기 둘만 빠져 있었다.
 *
 * ## 어떻게 재는가
 *
 * 소스에서 `signal` 이라는 글자를 찾는 검사는 아무것도 증명하지 못한다(주석에도 있고,
 * 넘기다 만 코드도 통과한다). 그래서 **실물 훅의 queryFn 을 실제로 돌린다**:
 *
 *  1. `react-dom/server` 로 훅을 한 번 렌더하면 옵저버가 만들어지면서 **그 훅이 정한
 *     옵션 그대로**의 Query 가 캐시에 앉는다(SSR 이라 요청은 아직 안 나간다).
 *  2. 그 Query 의 `fetch()` 를 부르면 훅이 쓴 `queryFn` 이 **진짜로** 실행된다.
 *  3. 서비스 목이 받은 `params.signal` 을 붙잡아 두고 `cancelQueries` 를 건다.
 *     넘겼으면 그 signal 이 `aborted` 로 뒤집힌다. 안 넘겼으면 `undefined` 다.
 *
 * 마지막 describe 는 수정 라우트가 **변이 하나 때문에 피드를 관찰하지 않는다**는
 * 계약(R6)이다. 화면 파일은 이 스위트에서 그릴 수 없어 소스로 본다
 * (`communityHonestStates.test.ts` 와 같은 처방 — 주석을 걷어낸 뒤 배선만 본다).
 */
/* eslint-disable import/first */
jest.mock("../src/features/recipe/services/communityPostService", () => ({
  communityPostService: {
    searchPosts: jest.fn(),
    getPopularPosts: jest.fn(),
    getPopularSearchKeywords: jest.fn(),
  },
}))

import { readFileSync } from "node:fs"
import { join } from "node:path"

import React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { communityPostService } from "@/src/features/recipe/services/communityPostService"
import {
  COMMUNITY_POPULAR_KEY,
  POST_SEARCH_KEY,
} from "@/src/features/recipe/hooks/communityFeedCache"
import { useCommunityPostSearch } from "@/src/features/recipe/hooks/useCommunityPostSearch"
import { useCommunityPopularPosts } from "@/src/features/recipe/hooks/useCommunityPopularPosts"

// @types/react-dom 이 없어 타입 선언만 require 로 우회한다. 런타임은 정식 빌드 그대로다.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require("react-dom/server") as {
  renderToStaticMarkup: (node: unknown) => string
}

const ROOT = join(__dirname, "..")
const readRaw = (path: string) => readFileSync(join(ROOT, path), "utf-8")

/** 주석을 걷어낸다 — 머리말이 계약을 대신 만족시키지 않게. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")
}

const searchPosts = communityPostService.searchPosts as jest.Mock
const getPopularPosts = communityPostService.getPopularPosts as jest.Mock

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

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
 * 훅이 정한 옵션 그대로 캐시에 앉은 Query 를 꺼내 **진짜로** 한 번 조회한다.
 * 반환된 프라미스는 잡지 않는다 — 취소되면 거절되기 때문(핸들러만 달아 둔다).
 */
function fetchThroughHookOptions(
  client: QueryClient,
  queryKey: readonly unknown[],
) {
  const query = client.getQueryCache().find({ queryKey })
  if (!query)
    throw new Error(`훅이 만든 쿼리가 없다: ${JSON.stringify(queryKey)}`)
  void query.fetch().catch(() => undefined)
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("검색 — 취소가 요청까지 닫는다", () => {
  it("queryFn 이 AbortSignal 을 서비스로 넘긴다", async () => {
    let seen: AbortSignal | undefined
    // 끝나지 않는 요청. 취소가 없으면 영원히 떠 있는다 — 그게 고치기 전 실제 모습이다.
    searchPosts.mockImplementation((params: { signal?: AbortSignal }) => {
      seen = params.signal
      return new Promise(() => {})
    })

    const client = newClient()
    render(client, () => {
      useCommunityPostSearch("김치")
      return null
    })
    fetchThroughHookOptions(client, [...POST_SEARCH_KEY, "김치"])
    await flush()

    expect(searchPosts).toHaveBeenCalledTimes(1)
    expect(seen).toBeInstanceOf(AbortSignal)
    expect(seen!.aborted).toBe(false)

    // 낙관 갱신 직전의 취소(`cancelFeedCacheQueries` 가 하는 일).
    await client.cancelQueries({ queryKey: [...POST_SEARCH_KEY, "김치"] })
    expect(seen!.aborted).toBe(true)
  })
})

describe("인기 목록 — 취소가 요청까지 닫는다", () => {
  it("queryFn 이 AbortSignal 을 서비스로 넘긴다", async () => {
    let seen: AbortSignal | undefined
    getPopularPosts.mockImplementation((params: { signal?: AbortSignal }) => {
      seen = params.signal
      return new Promise(() => {})
    })

    const client = newClient()
    render(client, () => {
      useCommunityPopularPosts("week", null, 20)
      return null
    })
    fetchThroughHookOptions(client, [
      ...COMMUNITY_POPULAR_KEY,
      "week",
      null,
      20,
    ])
    await flush()

    expect(getPopularPosts).toHaveBeenCalledTimes(1)
    expect(seen).toBeInstanceOf(AbortSignal)
    expect(seen!.aborted).toBe(false)

    await client.cancelQueries({
      queryKey: [...COMMUNITY_POPULAR_KEY, "week", null, 20],
    })
    expect(seen!.aborted).toBe(true)
  })

  it("기간·카테고리·상한은 그대로 실려 간다(signal 을 끼우며 잃지 않았다)", async () => {
    getPopularPosts.mockResolvedValue([])

    const client = newClient()
    render(client, () => {
      useCommunityPopularPosts("realtime", "diet", 5)
      return null
    })
    fetchThroughHookOptions(client, [
      ...COMMUNITY_POPULAR_KEY,
      "realtime",
      "diet",
      5,
    ])
    await flush()

    expect(getPopularPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        period: "realtime",
        category: "diet",
        limit: 5,
      }),
    )
  })
})

describe("수정 라우트는 변이 하나 때문에 피드를 관찰하지 않는다 (R6)", () => {
  const EDIT_ROUTE = "src/features/recipe/views/FreePostEditScreen.tsx"

  it("`observe: false` 로 부른다", () => {
    const source = stripComments(readRaw(EDIT_ROUTE))
    expect(source).toMatch(/useCommunityPosts\(\{\s*observe:\s*false\s*\}\)/u)
  })

  it("관찰을 켜는 옛 호출이 남아 있지 않다", () => {
    const source = stripComments(readRaw(EDIT_ROUTE))
    expect(source).not.toMatch(/useCommunityPosts\(\s*\)/u)
  })

  it("작성 화면이 쓰는 것과 **같은** 옵션 이름이다", () => {
    // 옵션 이름이 최근에 바뀐 적이 있다 — 두 화면이 갈리면 한쪽만 낡는다.
    const editor = stripComments(
      readRaw("src/features/recipe/components/FreePostEditor.tsx"),
    )
    expect(editor).toMatch(/useCommunityPosts\(\{\s*observe:\s*false\s*\}\)/u)
  })
})
