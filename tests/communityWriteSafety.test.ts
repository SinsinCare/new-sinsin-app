/**
 * **커뮤니티 쓰기가 실패했을 때 화면이 거짓말을 하지 않는가.**
 *
 * 감사에서 나온 것들을 훅으로 직접 재현해 못 박는다. 셋 다 "실패했는데 성공한 것처럼
 * 보인다" 는 한 가지 병이다.
 *
 *  - **삭제(P0).** `deletePost` 를 쏘고 곧바로 `router.back()` 했다. 낙관 삭제는
 *    `onMutate` 에 있었고 실패 경로는 재조회뿐이었는데, 삭제가 실패하는 가장 흔한
 *    이유가 회선이 없어서다 — 그 재조회도 못 나간다. 결과: 글은 피드·검색·인기에서
 *    사라지고, 아무 말도 없고, 며칠 뒤 자연 재검증이 되살린다.
 *  - **좋아요·북마크(P0).** 토글(POST)은 재시도가 상태를 뒤집는다. 절대 상태(PUT)로
 *    옮겼는데, 그 절대값을 **언제** 정하느냐가 남는다. 취소를 기다리는 `await` 앞에서
 *    정하면 연타의 두 요청이 같은 값을 싣는다 — 캐시는 두 번 뒤집혀 원위치, 서버는
 *    한 번만 바뀐다. 여기서는 번호·델타·절대값이 한 벌인지를 확인한다.
 *  - **댓글 하트.** 여기만 옛 스냅숏 되씌우기가 남아 있었고, 그게 안 보이던 이유는
 *    하트마다 댓글 목록을 통째로 다시 받고 있었기 때문이다(오프라인에서는 안 낫는다).
 *
 * ## 어떻게 훅을 돌리나
 *
 * `communityToggleAcrossScreens.test.ts` 와 같은 처방이다 — 이 저장소의 jest 에는
 * RN 렌더러가 없어서 `react-dom/server` 로 **한 번만** 렌더해 훅의 반환값을 붙잡고,
 * 이후는 캐시를 직접 읽어 단언한다. 사본이 아니라 **실물 훅**이 돌기 때문에 배선을
 * 되돌리면 여기가 빨개진다. (이펙트는 돌지 않는다 — 그래서 "지워진 글을 계보에서
 * 뺀다" 는 이펙트가 아니라 `queryFn` 의 실패 갈래에 있다.)
 *
 * 화면 파일(`app/post/[id].tsx` · `FreePostEditor.tsx`)은 그릴 방법이 없으므로
 * `communityHonestStates.test.ts` 처럼 **주석을 걷어낸 소스**의 배선을 본다.
 */
/* eslint-disable import/first */
jest.mock("../src/features/recipe/services/communityPostService", () => ({
  communityPostService: {
    setLiked: jest.fn(),
    setBookmarked: jest.fn(),
    setCommentLiked: jest.fn(),
    deletePost: jest.fn(),
    getPost: jest.fn(),
    getPosts: jest.fn(),
    getComments: jest.fn(),
    recordPostView: jest.fn(() => new Promise(() => {})),
  },
}))

import { readFileSync } from "node:fs"
import { join } from "node:path"

import React from "react"
import {
  QueryClient,
  QueryClientProvider,
  QueryObserver,
} from "@tanstack/react-query"

import { communityPostService } from "@/src/features/recipe/services/communityPostService"
import {
  COMMUNITY_POPULAR_KEY,
  POSTS_KEY,
  POST_SEARCH_KEY,
  type CommunityFeedData,
} from "@/src/features/recipe/hooks/communityFeedCache"
import { useCommunityPosts } from "@/src/features/recipe/hooks/useCommunityPosts"
import {
  POST_COMMENTS_KEY,
  usePostDetail,
} from "@/src/features/recipe/hooks/usePostDetail"
import type {
  CommunityComment,
  CommunityMealPost,
} from "@/src/features/recipe/types"
import { ApiError } from "@/src/services/core/apiError"

// @types/react-dom 이 없어 타입 선언만 require 로 우회한다. 런타임은 정식 빌드 그대로다.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require("react-dom/server") as {
  renderToStaticMarkup: (node: unknown) => string
}

const POST_ID = "1"
const OTHER_ID = "2"
const FEED_KEY = [...POSTS_KEY, { tag: null, category: null, sort: "recent" }]
const SEARCH_KEY = [...POST_SEARCH_KEY, "김치"]
const POPULAR_KEY = [...COMMUNITY_POPULAR_KEY, "week", null, 20]
const COMMENTS_KEY = [...POST_COMMENTS_KEY, POST_ID]

const setLiked = communityPostService.setLiked as jest.Mock
const setCommentLiked = communityPostService.setCommentLiked as jest.Mock
const deletePost = communityPostService.deletePost as jest.Mock
const getPost = communityPostService.getPost as jest.Mock
const getComments = communityPostService.getComments as jest.Mock

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
  } satisfies CommunityMealPost
}

function comment(
  id: string,
  overrides: Partial<CommunityComment> = {},
): CommunityComment {
  return {
    id,
    postId: POST_ID,
    parentCommentId: null,
    authorId: 2,
    authorName: "댓글쓴이",
    content: "댓글",
    mentions: [],
    likes: 2,
    liked: false,
    isDeleted: false,
    createdAt: new Date("2026-08-20T00:00:00Z"),
    replies: [],
    ...overrides,
  }
}

const pages = (items: CommunityMealPost[]): CommunityFeedData => ({
  pages: [{ posts: items, nextCursor: null }],
  pageParams: [undefined],
})

/** 마이크로태스크·매크로태스크를 한 번 비운다. 열어 두지 않은 프라미스는 여기서 안 풀린다. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function newClient() {
  return new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
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

/** 같은 글이 피드·검색·인기 **세 캐시 모두**에 살아 있는 상태. */
function seededLineage() {
  const client = newClient()
  client.setQueryData(FEED_KEY, pages([post(POST_ID), post(OTHER_ID)]))
  client.setQueryData(SEARCH_KEY, pages([post(POST_ID)]))
  client.setQueryData(POPULAR_KEY, [post(POST_ID)])
  return client
}

function mountFeed(client: QueryClient) {
  let feed: ReturnType<typeof useCommunityPosts> | null = null
  render(client, () => {
    // 목록 훅만 본다 — 관찰은 끄고 캐시만 읽는다(요청 0개).
    feed = useCommunityPosts({ observe: false })
    return null
  })
  if (feed === null) throw new Error("훅이 렌더되지 않았다")
  return feed as ReturnType<typeof useCommunityPosts>
}

function mountDetail(client: QueryClient) {
  let detail: ReturnType<typeof usePostDetail> | null = null
  render(client, () => {
    detail = usePostDetail(POST_ID)
    return null
  })
  if (detail === null) throw new Error("훅이 렌더되지 않았다")
  return detail as ReturnType<typeof usePostDetail>
}

const feedIds = (client: QueryClient) =>
  client
    .getQueryData<CommunityFeedData>(FEED_KEY)!
    .pages.flatMap((page) => page.posts.map((item) => item.id))
const searchIds = (client: QueryClient) =>
  client
    .getQueryData<CommunityFeedData>(SEARCH_KEY)!
    .pages.flatMap((page) => page.posts.map((item) => item.id))
const popularIds = (client: QueryClient) =>
  client.getQueryData<CommunityMealPost[]>(POPULAR_KEY)!.map((item) => item.id)

const commentTree = (client: QueryClient) =>
  client.getQueryData<CommunityComment[]>(COMMENTS_KEY)!

/** 회선이 없다 — 우리 HTTP 계층이 실어 주는 모양 그대로. */
const offline = () => new ApiError("네트워크", "ERR_NETWORK", undefined, true)
const timedOut = () => new ApiError("타임아웃", "ECONNABORTED", undefined, true)
const gone = () =>
  new ApiError("이 글은 사라졌어요", "COMMUNITY_ERROR_001", 404)

beforeEach(() => {
  setLiked.mockReset()
  setCommentLiked.mockReset()
  deletePost.mockReset()
  getPost.mockReset()
  getComments.mockReset()
})

/* ─────────────────────────── A1 · 삭제 ─────────────────────────── */

describe("삭제는 확정된 뒤에만 지운다", () => {
  it("오프라인에서 실패하면 글이 **어느 캐시에서도** 사라지지 않는다", async () => {
    const client = seededLineage()
    const feed = mountFeed(client)
    deletePost.mockRejectedValue(offline())

    await expect(feed.deletePostAsync(POST_ID)).rejects.toThrow()
    await flush()

    /*
      낙관 삭제가 `onMutate` 에 있던 시절의 실측이 `["2"]` 였다 — 지운 글이 화면에서
      사라진 채 굳고(되돌릴 방법이 없다) 아무 말도 없었다.
    */
    expect(feedIds(client)).toEqual([POST_ID, OTHER_ID])
    expect(searchIds(client)).toEqual([POST_ID])
    expect(popularIds(client)).toEqual([POST_ID])
  })

  it("성공하면 계보 셋 전부에서 지운다", async () => {
    const client = seededLineage()
    const feed = mountFeed(client)
    deletePost.mockResolvedValue(undefined)

    await feed.deletePostAsync(POST_ID)
    await flush()

    expect(feedIds(client)).toEqual([OTHER_ID])
    // 인기 레일에 남으면 탭했을 때 오류 화면으로 간다. 검색 결과도 같다.
    expect(searchIds(client)).toEqual([])
    expect(popularIds(client)).toEqual([])
  })

  it("실패를 호출부가 **받을 수 있다** — 그래야 화면을 안 나간다", async () => {
    const client = seededLineage()
    const feed = mountFeed(client)
    deletePost.mockRejectedValue(offline())

    // `mutate`(fire-and-forget)만 내보내던 시절에는 실패가 훅 안에서 끝났다.
    await expect(feed.deletePostAsync(POST_ID)).rejects.toMatchObject({
      code: "ERR_NETWORK",
    })
  })
})

/* ─────────────────────── A2 · 절대 상태의 순간 ─────────────────────── */

describe("좋아요는 절대 상태를 델타와 같은 순간에 정한다", () => {
  it("한 프레임 안의 연타 두 번이 서로 **반대**를 보낸다", async () => {
    const client = seededLineage()
    const feed = mountFeed(client)
    setLiked.mockImplementation(() => new Promise(() => {}))

    // 사이에 아무것도 끼우지 않는다 — 진짜 연타는 취소가 끝나기 전에 두 번째가 온다.
    feed.toggleLike(POST_ID)
    feed.toggleLike(POST_ID)
    await flush()

    /*
      호출부에서(또는 `onMutate` 의 `await` **앞**에서) 절대값을 정하면 둘 다 아직
      `liked:false` 를 읽어 `[true, true]` 가 된다 — 캐시는 두 번 뒤집혀 원위치인데
      서버는 한 번만 켜진다. 번호·델타·절대값이 한 벌일 때만 이 값이 나온다.
    */
    expect(setLiked.mock.calls).toEqual([
      [POST_ID, true],
      [POST_ID, false],
    ])
  })

  it("타임아웃으로 되돌아간 하트를 다시 누르면 **같은 값**을 다시 보낸다", async () => {
    const client = seededLineage()
    const feed = mountFeed(client)
    setLiked.mockRejectedValueOnce(timedOut())

    feed.toggleLike(POST_ID)
    await flush()
    await flush()
    // 서버는 12초에 커밋했을 수 있지만 앱은 실패로 본다 — 하트는 되돌아간다.
    expect(feedIds(client)).toEqual([POST_ID, OTHER_ID])
    expect(
      client.getQueryData<CommunityFeedData>(FEED_KEY)!.pages[0].posts[0].liked,
    ).toBe(false)

    setLiked.mockResolvedValueOnce({ liked: true, likes: 11 })
    feed.toggleLike(POST_ID)
    await flush()

    /*
      토글이었다면 두 번째 요청은 "뒤집어" 였고, 서버가 이미 켜져 있었으므로 **껐다**.
      절대 상태는 같은 `true` 를 한 번 더 보내고, 서버가 이미 true 여도 결과는 true 다.
    */
    expect(setLiked.mock.calls[1]).toEqual([POST_ID, true])
  })

  it("캐시에 없는 글은 절대값을 **지어내지 않는다**(요청이 안 나간다)", async () => {
    const client = newClient()
    const feed = mountFeed(client)

    feed.toggleLike("없는-글")
    await flush()

    expect(setLiked).not.toHaveBeenCalled()
  })
})

/* ─────────────────────── A4 · 지워진 글 ─────────────────────── */

describe("남이 지운 글", () => {
  it("`COMMUNITY_ERROR_001` 이면 계보에서 빼고 묘비를 세운다", async () => {
    const client = seededLineage()
    const detail = mountDetail(client)
    getPost.mockRejectedValue(gone())

    await detail.refetch()
    await flush()

    // 화면이 이 값으로 캐시 사본을 이긴다(`isError && (!post || isPostGone)`).
    expect(mountDetail(client).isPostGone).toBe(true)
    // 피드·검색·인기의 행도 유령이다 — 다음 사람이 또 열지 않게 지운다.
    expect(feedIds(client)).toEqual([OTHER_ID])
    expect(searchIds(client)).toEqual([])
    expect(popularIds(client)).toEqual([])
  })

  it("전송 실패는 **아무 것도 지우지 않는다** — 회선이 끊겼다고 글이 사라지면 안 된다", async () => {
    const client = seededLineage()
    const detail = mountDetail(client)
    getPost.mockRejectedValue(offline())

    await detail.refetch()
    await flush()

    expect(mountDetail(client).isPostGone).toBe(false)
    expect(feedIds(client)).toEqual([POST_ID, OTHER_ID])
    expect(searchIds(client)).toEqual([POST_ID])
    expect(popularIds(client)).toEqual([POST_ID])
  })
})

/* ─────────────────────── A9 · 댓글 하트 ─────────────────────── */

describe("댓글 하트도 글 하트와 같은 장치를 쓴다", () => {
  /** `ageMs` 만큼 묵은 댓글 캐시를 깔고 상세 훅을 올린다(나이 보존을 재려면 필요하다). */
  function mountWithComments(ageMs = 0) {
    const client = seededLineage()
    client.setQueryData(
      COMMENTS_KEY,
      [comment("c1"), comment("c2", { replies: [comment("c3")] })],
      { updatedAt: Date.now() - ageMs },
    )
    const detail = mountDetail(client)
    return { client, detail }
  }

  it("연타 두 번이 서로 반대의 절대값을 보낸다", async () => {
    const { detail } = mountWithComments()
    setCommentLiked.mockImplementation(() => new Promise(() => {}))

    void detail.toggleCommentLike("c1")
    void detail.toggleCommentLike("c1")
    await flush()

    expect(setCommentLiked.mock.calls).toEqual([
      [POST_ID, "c1", true],
      [POST_ID, "c1", false],
    ])
  })

  it("둘 다 실패하면 정확히 원상으로 — 스냅숏 되씌우기는 하나를 남겼다", async () => {
    const { client, detail } = mountWithComments()
    setCommentLiked.mockRejectedValue(offline())

    void detail.toggleCommentLike("c1").catch(() => {})
    void detail.toggleCommentLike("c1").catch(() => {})
    await flush()
    await flush()

    /*
      옛 방식은 `onMutate` 시점의 트리 사본을 되씌웠다. 두 번째 탭의 사본에는 첫 탭의
      델타가 이미 들어 있어서, 마지막 되씌우기가 그것을 복원해 **하트가 눌린 채** 남았다.
      자기 역함수 델타를 두 번 되돌리면 순서에 무관하게 원상이다.
    */
    expect(commentTree(client)[0]).toMatchObject({ liked: false, likes: 2 })
  })

  it("응답이 뒤바뀌어 와도 **나중에 시작한** 토글의 확정값이 남는다", async () => {
    const { client, detail } = mountWithComments()
    const settle: ((value: { liked: boolean; likes: number }) => void)[] = []
    setCommentLiked.mockImplementation(
      () =>
        new Promise<{ liked: boolean; likes: number }>((resolve) => {
          settle.push(resolve)
        }),
    )

    void detail.toggleCommentLike("c1")
    void detail.toggleCommentLike("c1")
    await flush()

    settle[1]({ liked: false, likes: 2 })
    await flush()
    // 옛 응답이 뒤늦게 온다 — 순번 판정이 버려야 한다.
    settle[0]({ liked: true, likes: 3 })
    await flush()

    expect(commentTree(client)[0]).toMatchObject({ liked: false, likes: 2 })
  })

  it("답글(중첩된 댓글)의 하트도 그 자리만 고친다", async () => {
    const { client, detail } = mountWithComments()
    setCommentLiked.mockResolvedValue({ liked: true, likes: 3 })

    void detail.toggleCommentLike("c3")
    await flush()

    expect(setCommentLiked.mock.calls[0]).toEqual([POST_ID, "c3", true])
    expect(commentTree(client)[1].replies[0]).toMatchObject({
      liked: true,
      likes: 3,
    })
    expect(commentTree(client)[0]).toMatchObject({ liked: false, likes: 2 })
  })

  it("하트 한 번이 **댓글 전체 왕복**을 사지 않는다", async () => {
    const { client, detail } = mountWithComments()
    setCommentLiked.mockResolvedValue({ liked: true, likes: 3 })
    getComments.mockResolvedValue([comment("c1")])

    /*
      정산 무효화가 `active` 이던 시절에는 여기서 목록이 통째로 다시 날아갔다.
      SSR 렌더는 구독을 만들지 않으므로 관찰자를 손으로 하나 붙여 **살아 있는 화면**을
      흉내 낸다 — 안 붙이면 `active` 여도 재조회가 안 나가서 이 테스트가 아무것도
      증명하지 못한다.
    */
    const observer = new QueryObserver(client, {
      queryKey: COMMENTS_KEY,
      queryFn: () => communityPostService.getComments(POST_ID),
      staleTime: 30_000,
    })
    const unsubscribe = observer.subscribe(() => {})
    getComments.mockClear()

    void detail.toggleCommentLike("c1")
    await flush()
    await flush()

    expect(getComments).not.toHaveBeenCalled()
    // 그 대신 낡음 표시는 남는다 — 다음 자연 재검증(복귀·당김)이 마저 맞춘다.
    expect(client.getQueryState(COMMENTS_KEY)?.isInvalidated).toBe(true)
    unsubscribe()
  })

  it("낙관 패치가 댓글 캐시의 **나이를 밀지 않는다**", async () => {
    // 2분 묵은 캐시로 깐다 — 같은 밀리초에 찍히면 "안 밀었다" 를 증명할 수 없다.
    const { client, detail } = mountWithComments(120_000)
    const seededAt = client.getQueryState(COMMENTS_KEY)!.dataUpdatedAt
    expect(Date.now() - seededAt).toBeGreaterThan(60_000)
    setCommentLiked.mockResolvedValue({ liked: true, likes: 3 })

    void detail.toggleCommentLike("c1")
    await flush()

    // "방금 서버와 맞췄다" 를 선언하면 staleTime(30초) 동안 새 답글이 안 보인다.
    expect(client.getQueryState(COMMENTS_KEY)?.dataUpdatedAt).toBe(seededAt)
  })
})

/* ────────────────────── 화면 배선(소스 계약) ────────────────────── */

/**
 * 줄 주석·블록 주석을 지운다. 문자열·템플릿 안의 `//` 는 남긴다(URL 이 통째로
 * 사라지면 그것대로 거짓 실패다). `communityHonestStates.test.ts` 에도 같은 도구가
 * 있지만, 테스트 파일을 import 하면 그쪽 스위트가 여기서 한 번 더 돈다.
 *
 * **주석을 걷는 것이 핵심이다.** 안 걷으면 "왜 이렇게 했는지" 적어 둔 문장이 계약을
 * 대신 만족시킨다 — 이 저장소에서 실제로 그렇게 통과한 테스트가 있었다.
 */
function stripComments(source: string): string {
  let out = ""
  let quote: string | null = null
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    const next = source[i + 1]
    if (quote) {
      out += char
      if (char === "\\") {
        out += next ?? ""
        i += 1
        continue
      }
      if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char
      out += char
      continue
    }
    if (char === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") i += 1
      out += "\n"
      continue
    }
    if (char === "/" && next === "*") {
      i += 2
      while (
        i < source.length &&
        !(source[i] === "*" && source[i + 1] === "/")
      ) {
        i += 1
      }
      i += 1
      continue
    }
    out += char
  }
  return out
}

const ROOT = join(__dirname, "..")
const read = (path: string) =>
  stripComments(readFileSync(join(ROOT, path), "utf-8"))

const DETAIL = "app/post/[id].tsx"
const EDITOR = "src/features/recipe/components/FreePostEditor.tsx"

describe("글 상세 화면", () => {
  it("삭제는 성공을 기다린 뒤에만 화면을 나가고, 실패는 말한다", () => {
    const source = read(DETAIL)
    expect(source).toContain("await deletePostAsync(post!.id)")
    expect(source).toMatch(
      /catch \(deleteError\)[\s\S]*presentCommunityError\(deleteError[\s\S]*return/,
    )
    // 실패해도 `router.back()` 이 돌던 자리 — 이제 catch 가 먼저 돌아간다.
    expect(source).not.toContain("deletePost(post!.id)")
  })

  it("지워진 글이면 캐시 사본이 아니라 묘비를 그린다", () => {
    expect(read(DETAIL)).toContain("if (isError && (!post || isPostGone))")
  })

  it("답글의 ⋯ 메뉴에는 '답글' 이 없다(서버가 못 받는다)", () => {
    const source = read(DETAIL)
    expect(source).toContain("handleCommentMore(comment, isReply)")
    expect(source).toMatch(/const replyEntry = isReply\s*\?\s*\[\]/)
  })

  it("댓글 오류의 재시도는 **댓글**을 다시 받는다", () => {
    const source = read(DETAIL)
    expect(source).toMatch(
      /commentsError[\s\S]{0,400}onPress=\{\(\) => void refetchComments\(\)\}/,
    )
  })

  it("지워진 댓글은 글쓴이를 밝히지 않는다", () => {
    const source = read(DETAIL)
    // 이름·시각 줄이 `!comment.isDeleted` 안으로 들어가야 한다.
    expect(source).toMatch(
      /\{!comment\.isDeleted && \(\s*<View style=\{styles\.commentNameRow\}>/,
    )
  })

  it("대상이 사라진 수정은 입력 바의 겨눔을 푼다", () => {
    const source = read(DETAIL)
    expect(source).toMatch(
      /const targetVanished =[\s\S]{0,240}COMMUNITY_ERROR_008[\s\S]{0,240}COMMUNITY_ERROR_009/,
    )
    expect(source).toMatch(
      /if \(editingCommentId && targetVanished\) \{\s*setEditingCommentId\(null\)/,
    )
  })
})

describe("글쓰기 화면", () => {
  it("변이 하나 때문에 피드를 관찰하지 않는다", () => {
    expect(read(EDITOR)).toContain("useCommunityPosts({ observe: false })")
  })

  it("이미 올라간 사진은 다시 올리지 않는다(재시도는 이어 올린다)", () => {
    const source = read(EDITOR)
    // 읽는 쪽(건너뛰기)과 쓰는 쪽(기록)이 **둘 다** 있어야 재시도가 이어진다.
    expect(source).toMatch(
      /const known = uploadedPathsRef\.current\[imageUri\][\s\S]{0,120}imageObjectPaths\.push\(known\)/,
    )
    expect(source).toContain(
      "uploadedPathsRef.current[imageUri] = uploaded.objectPath",
    )
  })

  it("요청이 나간 뒤의 무응답에는 '다시 시도' 를 주지 않는다", () => {
    const source = read(EDITOR)
    expect(source).toMatch(
      /const mayHaveCommitted =\s*createRequested &&\s*\(resolved\.kind === "timeout" \|\| resolved\.kind === "offline"\)/,
    )
    expect(source).toContain("retry: mayHaveCommitted ? undefined :")
  })

  it("재시도는 **지금** 입력값으로 다시 보낸다", () => {
    const source = read(EDITOR)
    // 클로저(`() => void handleSubmit()`)는 실패한 렌더의 제목·본문을 다시 보냈다.
    expect(source).toContain("submitRef.current()")
    expect(source).toContain("submitRef.current = handleSubmit")
    expect(source).not.toContain("retry: () => void handleSubmit()")
  })

  it("올린 뒤에는 그 글로 데려간다(필터 걸린 피드에 떨구지 않는다)", () => {
    const source = read(EDITOR)
    expect(source).toContain("router.replace(`/post/${created.id}` as Href)")
  })
})
