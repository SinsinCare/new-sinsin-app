/**
 * **커뮤니티의 쓰기는 재시도해도 안전한가.**
 *
 * 서버는 좋아요·북마크·댓글 좋아요의 경로마다 메서드를 둘 둔다
 * (`sinsin-be-bun/src/domains/community/routes.ts` 의 "좋아요 · 북마크" 절):
 *
 *  - `POST /posts/:id/like` — 토글. 서버가 지금 상태를 읽어 뒤집는다.
 *  - `PUT  /posts/:id/like  { liked }` — 절대 상태. 몇 번 보내도 결과가 같다.
 *
 * 앱은 토글을 쓰고 있었다. axios 타임아웃은 10초인데(`apiClient.ts`) 서버 핸들러는
 * 그 시각을 넘겨서도 계속 돌기 때문에, 12초에 커밋된 요청이 앱에서는 실패로 보인다 —
 * 하트는 꺼지고 DB 는 켜져 있고, 정산 무효화가 `refetchType:"none"` 이라 그 세션에서는
 * 아무도 고쳐 주지 않는다. 그 상태에서 한 번 더 누르면 토글은 **켜진 것을 끈다.**
 * 서버 주석도 "앱이 옮겨오면 POST 를 지운다" 고 적어 두었다.
 *
 * 이 파일은 **와이어 계약**을 고정한다 — 어떤 메서드로, 어떤 본문으로 나가는지.
 * (그 절대값을 언제 정하는지는 `communityWriteSafety.test.ts` 가 훅으로 확인한다.)
 *
 * 곁들여 두 가지를 더 못 박는다:
 *  - 목록 계열 읽기가 `AbortSignal` 을 **실제로** 들고 나간다. 없으면 `cancelQueries`
 *    가 프라미스만 떼어 놓고 HTTP 는 끝까지 간다 — 취소가 취소가 아니게 된다.
 *  - 그렇게 취소된 요청이 던지는 query-core 의 `CancelledError` 를 `resolveError` 가
 *    **조용한 실패**로 알아본다. 못 알아보면 당겨서 새로고침하다 하트를 누른 사람이
 *    "알 수 없는 오류" 토스트를 본다.
 */
/* eslint-disable import/first */
// jest.mock 은 파일 맨 위로 끌어올려진다 — 팩토리가 참조하는 변수는 `mock` 접두어여야 한다.
const mockApiGet = jest.fn()
const mockApiPut = jest.fn()
const mockApiPost = jest.fn()
const mockApiPatch = jest.fn()
const mockApiDelete = jest.fn()
jest.mock("../src/services/core/apiClient", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    put: (...args: unknown[]) => mockApiPut(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
    patch: (...args: unknown[]) => mockApiPatch(...args),
    delete: (...args: unknown[]) => mockApiDelete(...args),
  },
}))

import { CancelledError } from "@tanstack/react-query"

import { communityPostService } from "@/src/features/recipe/services/communityPostService"
import { resolveError } from "@/src/lib/errorMessage/resolve"
import { ApiError } from "@/src/services/core/apiError"

/** axios 응답 흉내 — 서버 봉투(result)와 헤더만 있으면 된다. */
const envelope = (payload: unknown, headers: Record<string, string> = {}) => ({
  data: { result: payload },
  headers,
})

beforeEach(() => {
  mockApiGet.mockReset()
  mockApiPut.mockReset()
  mockApiPost.mockReset()
  mockApiPatch.mockReset()
  mockApiDelete.mockReset()
})

describe("좋아요 · 북마크는 절대 상태를 PUT 으로 보낸다", () => {
  it("좋아요 — 켜기도 끄기도 같은 경로에 상태만 실어 보낸다", async () => {
    mockApiPut.mockResolvedValueOnce(envelope({ liked: true, likes: 11 }))
    expect(await communityPostService.setLiked("42", true)).toEqual({
      liked: true,
      likes: 11,
    })
    expect(mockApiPut).toHaveBeenLastCalledWith("/community/posts/42/like", {
      liked: true,
    })

    mockApiPut.mockResolvedValueOnce(envelope({ liked: false, likes: 10 }))
    expect(await communityPostService.setLiked("42", false)).toEqual({
      liked: false,
      likes: 10,
    })
    expect(mockApiPut).toHaveBeenLastCalledWith("/community/posts/42/like", {
      liked: false,
    })
  })

  it("북마크 — 서버 계약대로 `{ bookmarked }` 다", async () => {
    mockApiPut.mockResolvedValueOnce(envelope({ bookmarked: true }))
    expect(await communityPostService.setBookmarked("42", true)).toEqual({
      bookmarked: true,
    })
    expect(mockApiPut).toHaveBeenLastCalledWith(
      "/community/posts/42/bookmark",
      {
        bookmarked: true,
      },
    )
  })

  it("댓글 좋아요도 멱등한 쪽을 쓰고 **확정값을 돌려준다**", async () => {
    mockApiPut.mockResolvedValueOnce(envelope({ liked: true, likes: 3 }))
    // 옛 구현은 응답을 버렸다(`Promise<void>`) — 그래서 낙관치를 덮을 값이 없었고
    // 정산은 매번 댓글 목록을 통째로 다시 받아야 했다.
    expect(await communityPostService.setCommentLiked("42", "7", true)).toEqual(
      {
        liked: true,
        likes: 3,
      },
    )
    expect(mockApiPut).toHaveBeenLastCalledWith(
      "/community/posts/42/comments/7/like",
      { liked: true },
    )
  })

  it("**토글 경로는 더 이상 아무도 부르지 않는다**", async () => {
    mockApiPut.mockResolvedValue(envelope({ liked: true, likes: 1 }))
    await communityPostService.setLiked("42", true)
    mockApiPut.mockResolvedValue(envelope({ bookmarked: true }))
    await communityPostService.setBookmarked("42", true)
    mockApiPut.mockResolvedValue(envelope({ liked: true, likes: 1 }))
    await communityPostService.setCommentLiked("42", "7", true)

    // `POST /like` 가 한 번이라도 나가면 재시도가 상태를 뒤집을 수 있다는 뜻이다.
    expect(mockApiPost).not.toHaveBeenCalled()
  })

  it("모양이 어긋난 서버 응답은 `null` — 낙관 상태를 지어내지 않는다", async () => {
    mockApiPut.mockResolvedValueOnce(envelope({ liked: "yes", likes: 11 }))
    expect(await communityPostService.setLiked("42", true)).toBeNull()

    mockApiPut.mockResolvedValueOnce(envelope({}))
    expect(await communityPostService.setBookmarked("42", true)).toBeNull()

    mockApiPut.mockResolvedValueOnce(envelope({ liked: true }))
    expect(
      await communityPostService.setCommentLiked("42", "7", true),
    ).toBeNull()
  })
})

describe("목록 읽기는 취소 신호를 들고 나간다", () => {
  it("피드", async () => {
    const controller = new AbortController()
    mockApiGet.mockResolvedValueOnce(envelope([]))
    await communityPostService.getPosts({
      limit: 20,
      signal: controller.signal,
    })
    expect(mockApiGet.mock.calls[0][1]).toMatchObject({
      signal: controller.signal,
    })
  })

  it("검색", async () => {
    const controller = new AbortController()
    mockApiGet.mockResolvedValueOnce(envelope([]))
    await communityPostService.searchPosts({
      q: "김치",
      signal: controller.signal,
    })
    expect(mockApiGet.mock.calls[0][1]).toMatchObject({
      signal: controller.signal,
    })
  })

  it("인기 — 계보라서 같이 취소된다", async () => {
    const controller = new AbortController()
    mockApiGet.mockResolvedValueOnce(envelope([]))
    await communityPostService.getPopularPosts({
      period: "week",
      signal: controller.signal,
    })
    expect(mockApiGet.mock.calls[0][1]).toMatchObject({
      signal: controller.signal,
    })
  })
})

describe("취소는 아무것도 그리지 않는다", () => {
  it("query-core 의 `CancelledError` 를 조용한 실패로 알아본다", () => {
    const resolved = resolveError(new CancelledError())
    expect(resolved.kind).toBe("canceled")
    expect(resolved.silent).toBe(true)
    /*
      이 객체에는 `code` 도 `name` 도 없다(생성자가 `message` 에만 넣는다). 그래서
      `isApiErrorLike` 가 거짓이고, 알아보지 못하면 맨 아래 "알 수 없는 오류" 로
      떨어진다 — 당김 새로고침을 취소한 사람이 자기가 안 한 일로 토스트를 봤다.
    */
    expect(resolved.title).toBe("")
  })

  it("그 판정이 다른 실패까지 삼키지는 않는다", () => {
    const server = resolveError(new ApiError("boom", "HTTP_500", 500))
    expect(server.silent).toBe(false)
    expect(server.kind).toBe("server")

    const plain = resolveError(new Error("CancelledError"))
    // 문자열이 같다고 삼키면 진짜 실패가 사라진다 — 타입으로만 판정한다.
    expect(plain.silent).toBe(false)
  })
})
