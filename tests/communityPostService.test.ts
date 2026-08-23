/* eslint-disable import/first */
// jest.mock 은 파일 맨 위로 끌어올려진다 — 팩토리가 참조하는 변수는 `mock` 접두어여야 한다.
const mockApiGet = jest.fn()
jest.mock("../src/services/core/apiClient", () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}))

import {
  communityPostService,
  mapCommunityComment,
  parseServerDate,
} from "../src/features/recipe/services/communityPostService"

/** 서버 PostPayload 최소 모양 — 매퍼가 요구하는 필드만 채운다. */
function rawPost(id: number) {
  return {
    id,
    authorId: 1,
    authorName: "글쓴이",
    authorRole: "user",
    category: "diet",
    imageUri: null,
    title: `제목 ${id}`,
    description: "본문",
    likes: 0,
    liked: false,
    comments: 0,
    views: 0,
    rank: null,
    bookmarked: false,
    createdAt: "2026-06-23T00:00:00",
    tags: [],
    vote: null,
  }
}

/** axios 응답 흉내 — 서버 봉투(result)와 헤더만 있으면 된다. */
function envelope(
  payload: unknown,
  headers: Record<string, string> = {},
): { data: { result: unknown }; headers: Record<string, string> } {
  return { data: { result: payload }, headers }
}

beforeEach(() => {
  mockApiGet.mockReset()
})

describe("getPosts", () => {
  it("x-next-cursor 헤더가 있으면 커서, 없거나 비어 있으면 null", async () => {
    mockApiGet.mockResolvedValueOnce(
      envelope([rawPost(1)], { "x-next-cursor": "cursor-42" }),
    )
    const withHeader = await communityPostService.getPosts()
    expect(withHeader.nextCursor).toBe("cursor-42")

    mockApiGet.mockResolvedValueOnce(envelope([rawPost(2)]))
    const withoutHeader = await communityPostService.getPosts()
    expect(withoutHeader.nextCursor).toBeNull()

    mockApiGet.mockResolvedValueOnce(
      envelope([rawPost(3)], { "x-next-cursor": "" }),
    )
    const emptyHeader = await communityPostService.getPosts()
    expect(emptyHeader.nextCursor).toBeNull()
  })

  it("전체(category null)는 파라미터를 생략하고, limit 은 항상 · sort 는 그대로 보낸다", async () => {
    mockApiGet.mockResolvedValueOnce(envelope([]))
    await communityPostService.getPosts({
      tag: null,
      category: null,
      sort: "recent",
      cursor: null,
      limit: 20,
    })
    expect(mockApiGet).toHaveBeenCalledWith("/community/posts", {
      params: { sort: "recent", limit: 20 },
    })

    mockApiGet.mockResolvedValueOnce(envelope([]))
    await communityPostService.getPosts({
      category: "diet",
      sort: "views",
      cursor: "cursor-1",
      limit: 20,
    })
    expect(mockApiGet).toHaveBeenLastCalledWith("/community/posts", {
      params: {
        category: "diet",
        sort: "views",
        cursor: "cursor-1",
        limit: 20,
      },
    })
  })
})

describe("searchPosts", () => {
  it("서버 봉투(result)를 풀고 커서 헤더를 읽는다", async () => {
    mockApiGet.mockResolvedValueOnce(
      envelope([rawPost(7)], { "x-next-cursor": "cursor-7" }),
    )
    const page = await communityPostService.searchPosts({
      q: "저염",
      limit: 20,
    })
    expect(mockApiGet).toHaveBeenCalledWith("/community/posts/search", {
      params: { q: "저염", limit: 20 },
    })
    expect(page.posts).toHaveLength(1)
    expect(page.posts[0]).toMatchObject({ id: "7", title: "제목 7" })
    expect(page.posts[0].createdAt).toBeInstanceOf(Date)
    expect(page.nextCursor).toBe("cursor-7")
  })

  it("data 봉투(구서버 모양)도 같은 결과로 푼다", async () => {
    mockApiGet.mockResolvedValueOnce({
      data: { data: [rawPost(8)] },
      headers: {},
    })
    const page = await communityPostService.searchPosts({ q: "저염" })
    expect(page.posts.map((p) => p.id)).toEqual(["8"])
    expect(page.nextCursor).toBeNull()
  })
})

describe("getPopularSearchKeywords", () => {
  it("{ keywords: [...] } 봉투를 풀어 배열을 돌려준다", async () => {
    mockApiGet.mockResolvedValueOnce(
      envelope({
        keywords: [{ keyword: "저염", count: 12, rank: 1 }],
      }),
    )
    const keywords = await communityPostService.getPopularSearchKeywords(10)
    expect(mockApiGet).toHaveBeenCalledWith(
      "/community/search/popular-keywords",
      { params: { limit: 10 } },
    )
    expect(keywords).toEqual([{ keyword: "저염", count: 12, rank: 1 }])
  })

  it("봉투가 비어 있으면 빈 배열 — undefined 를 흘리지 않는다", async () => {
    mockApiGet.mockResolvedValueOnce(envelope(undefined))
    await expect(
      communityPostService.getPopularSearchKeywords(),
    ).resolves.toEqual([])
  })
})

describe("community post service mappers", () => {
  it("maps nested comment API payloads into app models", () => {
    const mapped = mapCommunityComment({
      id: 1,
      postId: 9,
      parentCommentId: null,
      authorId: null,
      authorName: "탈퇴한 사용자",
      content: "삭제된 댓글입니다",
      likes: 2,
      liked: true,
      isDeleted: true,
      createdAt: "2026-06-23T00:00:00",
      updatedAt: "2026-06-23T01:00:00",
      replies: [
        {
          id: 2,
          postId: 9,
          parentCommentId: 1,
          authorId: 3,
          authorName: "답글작성자",
          content: "답글",
          likes: 0,
          liked: false,
          isDeleted: false,
          createdAt: "2026-06-23T02:00:00",
          updatedAt: "2026-06-23T02:00:00",
          replies: [],
        },
      ],
    })

    expect(mapped.id).toBe("1")
    expect(mapped.authorId).toBeNull()
    expect(mapped.isDeleted).toBe(true)
    expect(mapped.createdAt).toBeInstanceOf(Date)
    expect(mapped.replies).toHaveLength(1)
    expect(mapped.replies[0]).toMatchObject({
      id: "2",
      parentCommentId: "1",
      content: "답글",
    })
  })
})

describe("parseServerDate", () => {
  it("타임존 없는 서버 시각은 UTC 로 읽는다 — KST 9시간 오차 방지", () => {
    const parsed = parseServerDate("2026-06-23T00:00:00")
    expect(parsed.getTime()).toBe(Date.UTC(2026, 5, 23, 0, 0, 0))
  })

  it("타임존이 명시된 문자열은 그대로 읽는다", () => {
    expect(parseServerDate("2026-06-23T00:00:00Z").getTime()).toBe(
      Date.UTC(2026, 5, 23),
    )
    expect(parseServerDate("2026-06-23T09:00:00+09:00").getTime()).toBe(
      Date.UTC(2026, 5, 23),
    )
  })

  it("Date 인스턴스는 손대지 않는다", () => {
    const date = new Date()
    expect(parseServerDate(date)).toBe(date)
  })
})
