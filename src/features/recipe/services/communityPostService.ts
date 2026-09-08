import type { AxiosResponse } from "axios"
import { api } from "@/src/services/core/apiClient"
import { parseServerDate } from "@/src/shared/utils/serverDate"
import {
  CommunityComment,
  CommunityCommentApi,
  CommunityAuthorProfile,
  CommunityAuthorSummary,
  CommunityMealPost,
  CommunityMealPostApi,
  CommunityPopularPeriod,
  CommunityPostVote,
  CommunityPostsPage,
  CommunitySortMode,
  CommunitySuggestedAuthor,
  CommunitySuggestedAuthorApi,
  CreateCommunityPostInput,
  ICommunityPostService,
  PopularSearchKeyword,
} from "../types"

/**
 * 서버 시각 파서. **정본은 `@/src/shared/utils/serverDate` 하나다** — 여기 있던 사본을
 * 지우고 그 자리에서 다시 내보낸다.
 *
 * 왜 지웠나: 같은 함수가 두 벌이면 한쪽만 고치는 순간 "커뮤니티 피드는 맞는데 후기만
 * 아홉 시간 어긋난다" 가 다시 생긴다. 실제로 그렇게 생겼던 결함이다.
 *
 * 왜 정본이 여기가 아닌가: 이 모듈은 로드 순간 `apiClient`(axios +
 * `EXPO_PUBLIC_BACKEND_URL`)를 끌고 온다. `src/types/chat.ts` 처럼 임포트가 없는 순수
 * 모듈이나 식당 후기 유틸이 시각 파서 하나 때문에 전송 계층을 들여올 수는 없다.
 *
 * 다시 내보내는 이유는 **기존 임포트를 그대로 살려 두기 위해서다**
 * (`ReviewSection` · `communityStoryService`). 새 코드는 정본에서 직접 가져올 것.
 */
export { parseServerDate }

function mapVote(raw: CommunityMealPostApi["vote"]): CommunityPostVote | null {
  if (!raw) return null
  return {
    id: Number(raw.id),
    title: raw.title ?? null,
    allowMultiple: raw.allowMultiple,
    options: raw.options.map((option) => ({
      id: Number(option.id),
      text: option.text,
      count: Number(option.count ?? 0),
    })),
    totalCount: Number(raw.totalCount ?? 0),
    myVote: raw.myVote && raw.myVote.length > 0 ? raw.myVote.map(Number) : null,
  }
}

/**
 * **"안 보냈다" 와 "탈퇴했다" 는 다른 사실이다.** (2026-08-21)
 *
 * 매퍼 세 곳이 `raw.authorId ?? null` 로 둘을 한 값에 뭉개고 있었다. 그런데
 * `isWithdrawnAuthor` 는 `authorId === null` 을 **탈퇴**로 읽고, 탈퇴 글쓴이는 차단
 * 필터에서 **면제**된다. 그래서 `authorId` 를 안 싣는 서버를 보면 모든 글이 탈퇴자가
 * 되어 클라이언트 차단 필터가 **전 화면에서 통째로 꺼진다** — 차단한 사람의 글이
 * 서버 응답이 도착하기 전 한 박자 동안 그대로 서 있고, 아무도 그 사실을 모른다.
 *
 * 바로 두 줄 아래의 `isMine` 이 이미 같은 이유로 `undefined` 를 보존한다
 * (`contentOwnership.isMyContent` 가 옛 서버 경로를 타야 해서). 신원 칸도 같은 규칙이다:
 * **서버가 말하지 않은 것은 지어내지 않는다.** 소비자는 전부 `!= null` 로 읽어서
 * (`isAuthorBlocked` · `isWithdrawnAuthor`) undefined 를 "모른다" 로 다룬다.
 */
function mapPost(raw: CommunityMealPostApi): CommunityMealPost {
  const imageUris =
    raw.imageUris && raw.imageUris.length > 0
      ? raw.imageUris
      : raw.imageUri
        ? [raw.imageUri]
        : []
  return {
    id: String(raw.id),
    // 서버가 안 보냈으면 undefined 그대로다 — `null` 은 **탈퇴**라는 뜻이다(위 머리말).
    authorId: raw.authorId,
    // 옛 서버는 안 보낸다 — undefined 로 남겨 `isMyContent()` 가 옛 경로를 타게 한다.
    isMine: raw.isMine ?? undefined,
    authorName: raw.authorName,
    authorRole: raw.authorRole,
    category: raw.category,
    imageUri: imageUris[0] ?? null,
    imageUris,
    imageObjectPaths: raw.imageObjectPaths ?? [],
    title: raw.title,
    description: raw.description,
    likes: raw.likes,
    liked: raw.liked,
    comments: raw.comments,
    views: Number(raw.views ?? 0),
    rank: raw.rank == null ? null : Number(raw.rank),
    bookmarked: raw.bookmarked,
    createdAt: parseServerDate(raw.createdAt),
    updatedAt: raw.updatedAt ? parseServerDate(raw.updatedAt) : undefined,
    tags: raw.tags ?? [],
    vote: mapVote(raw.vote),
  }
}

/**
 * 추천 작성자 한 명(`비슷한 단계의 이웃`). **없는 것을 지어내지 않는다** — `mapPost` 의
 * 신원 칸과 같은 규칙이다.
 *
 *  - `latestPostTitle`: 오늘의 서버는 이 칸이 없다. 빈 문자열도 `null` 로 접는다 —
 *    `""` 를 그대로 넘기면 행에 18pt 짜리 빈 줄이 서고, 그건 "제목이 없다" 가 아니라
 *    "제목을 못 그렸다" 로 읽힌다.
 *  - `badges`: 없으면 빈 배열. 배지가 0개인 것은 사실이고, 몇 개를 그릴지는 화면이 정한다.
 *  - `isFollowing`: 서버가 말하지 않으면 `false` 다. 후보 조회 자체가 "내가 아직 팔로우하지
 *    않은 사람" 을 뽑으므로 그 기본값이 서버의 뜻과 같다.
 */
function mapSuggestedAuthor(
  raw: CommunitySuggestedAuthorApi,
): CommunitySuggestedAuthor {
  const title = raw.latestPostTitle?.trim()
  return {
    id: Number(raw.id),
    nickName: raw.nickName,
    profileImageUrl: raw.profileImageUrl ?? null,
    isFollowing: raw.isFollowing === true,
    badges: raw.badges ?? [],
    latestPostTitle: title ? title : null,
  }
}

export function mapCommunityComment(
  raw: CommunityCommentApi,
): CommunityComment {
  return {
    id: String(raw.id),
    postId: String(raw.postId),
    parentCommentId:
      raw.parentCommentId === null || raw.parentCommentId === undefined
        ? null
        : String(raw.parentCommentId),
    // 글 매퍼와 같은 규칙 — 안 보낸 것을 `null`(탈퇴)로 지어내지 않는다(`mapPost` 머리말).
    authorId: raw.authorId,
    isMine: raw.isMine ?? undefined,
    authorName: raw.authorName,
    content: raw.content,
    mentions: raw.mentions ?? [],
    likes: Number(raw.likes ?? 0),
    liked: raw.liked,
    isDeleted: raw.isDeleted,
    createdAt: parseServerDate(raw.createdAt),
    updatedAt: raw.updatedAt ? parseServerDate(raw.updatedAt) : undefined,
    replies: (raw.replies ?? []).map(mapCommunityComment),
  }
}

/**
 * 다음 페이지 커서는 본문이 아니라 **`x-next-cursor` 응답 헤더**로 온다(서버 기존 패턴).
 * 값은 서버가 만든 불투명 문자열이다 — 클라이언트는 열어 보지 않고 그대로 되돌려 보낸다.
 * 헤더가 없거나 비어 있으면 마지막 페이지다.
 */
function readNextCursor(res: AxiosResponse): string | null {
  const raw = res.headers?.["x-next-cursor"]
  return typeof raw === "string" && raw.length > 0 ? raw : null
}

class CommunityPostService implements ICommunityPostService {
  async getPosts(params?: {
    authorId?: number
    library?: "mine" | "liked" | "bookmarked"
    tag?: string | null
    category?: string | null
    sort?: CommunitySortMode
    cursor?: string | null
    limit?: number
    /**
     * react-query 가 이 쿼리를 **실제로** 접을 수 있게 하는 손잡이.
     *
     * `cancelQueries`(좋아요·북마크·삭제의 낙관 갱신 직전)와 당김 새로고침의
     * `cancelRefetch` 는 `AbortSignal` 이 없으면 **프라미스만 떼어 놓는다** — HTTP 요청은
     * 그대로 끝까지 가고, 받아 온 페이지는 아무도 안 읽는 채로 버려진다. 회선이 느릴수록
     * 사용자가 낸 데이터 요금 그대로다. 넘겨 주면 axios 가 소켓을 닫는다.
     */
    signal?: AbortSignal
  }): Promise<CommunityPostsPage> {
    const res = await api.get("/community/posts", {
      params: {
        ...(params?.authorId ? { authorId: params.authorId } : {}),
        ...(params?.library ? { library: params.library } : {}),
        ...(params?.tag ? { tag: params.tag } : {}),
        // `전체` 는 파라미터를 **생략**한다 — 서버 계약(omit or `all` = no filter).
        ...(params?.category ? { category: params.category } : {}),
        ...(params?.sort ? { sort: params.sort } : {}),
        ...(params?.cursor ? { cursor: params.cursor } : {}),
        ...(params?.limit ? { limit: params.limit } : {}),
      },
      signal: params?.signal,
    })
    const list = (res.data.result ??
      res.data.data ??
      []) as CommunityMealPostApi[]
    return { posts: list.map(mapPost), nextCursor: readNextCursor(res) }
  }

  /** 검색도 피드와 같은 PostPayload · 같은 커서 방식(최신순 고정)이다. */
  async searchPosts(params: {
    q: string
    cursor?: string | null
    limit?: number
    /** 피드와 같은 이유(`getPosts` 의 `signal` 머리말). 검색어를 바꾸면 실제로 접힌다. */
    signal?: AbortSignal
  }): Promise<CommunityPostsPage> {
    const res = await api.get("/community/posts/search", {
      params: {
        q: params.q,
        ...(params.cursor ? { cursor: params.cursor } : {}),
        ...(params.limit ? { limit: params.limit } : {}),
      },
      signal: params.signal,
    })
    const list = (res.data.result ??
      res.data.data ??
      []) as CommunityMealPostApi[]
    return { posts: list.map(mapPost), nextCursor: readNextCursor(res) }
  }

  /** 최근 7일 인기 검색어. 서버가 rank 를 매겨 준다(1부터). */
  async getPopularSearchKeywords(limit = 10): Promise<PopularSearchKeyword[]> {
    const res = await api.get("/community/search/popular-keywords", {
      params: { limit },
    })
    const payload = (res.data.result ?? res.data.data) as
      | { keywords?: PopularSearchKeyword[] }
      | undefined
    return payload?.keywords ?? []
  }

  /**
   * 404 를 삼키지 않는다.
   *
   * 예전에는 404 를 `undefined` 로 바꿔 돌려줬는데, 그러면 서버가 준
   * `COMMUNITY_ERROR_001`("이 글은 사라졌어요") 이 호출부에 닿지 못한다. 게다가
   * react-query v5 는 queryFn 이 `undefined` 를 주면 **자기 오류**(`Query data cannot
   * be undefined`)로 바꿔 버려서, 화면에는 코드도 원인도 없는 일반 문구가 떴다 —
   * 지워진 글의 딥링크가 "인터넷을 확인" 처럼 읽히던 경로가 이것이다.
   *
   * 그대로 던지면 `resolveError` 가 코드로 문구를 고르고 재시도 버튼도 빼 준다.
   */
  async getPost(id: string): Promise<CommunityMealPost | undefined> {
    const res = await api.get(`/community/posts/${id}`)
    const raw = res.data.result ?? res.data.data
    return raw ? mapPost(raw as CommunityMealPostApi) : undefined
  }

  async getPopularPosts(params: {
    period: CommunityPopularPeriod
    category?: string | null
    limit?: number
    /** 인기 레일도 계보라 같이 취소된다(`cancelFeedCacheQueries`) — 같은 이유. */
    signal?: AbortSignal
  }): Promise<CommunityMealPost[]> {
    const res = await api.get("/community/posts/popular", {
      params: {
        period: params.period,
        ...(params.category ? { category: params.category } : {}),
        limit: params.limit ?? 20,
      },
      signal: params.signal,
    })
    const list = (res.data.result ??
      res.data.data ??
      []) as CommunityMealPostApi[]
    return list.map(mapPost)
  }

  /**
   * 추천 작성자 목록(`비슷한 단계의 이웃`, 리디자인 E1).
   *
   * **추천할 사람이 없으면 200 + 빈 배열이다 — 404 가 아니다**(서버 라우트 머리말).
   * 그래서 빈 배열은 오류가 아니라 "섹션을 접어라" 이고, 이 메서드는 그 구분을 흐리지
   * 않는다(빈 배열을 던지지도, 오류를 빈 배열로 삼키지도 않는다).
   *
   * `limit` 는 서버 기본 10 · 상한 20. 화면은 2행만 그리지만 **더 받아 온다** —
   * 차단 필터와 제목 없는 행이 앞에서 몇을 접을 수 있어서, 상한을 화면 행 수에
   * 맞추면 접히는 순간 섹션이 통째로 빈다.
   */
  async getSuggestedAuthors(params?: {
    limit?: number
    /** 피드 계보와 같은 이유(`getPosts` 의 `signal` 머리말). 없으면 요청은 끝까지 간다. */
    signal?: AbortSignal
  }): Promise<CommunitySuggestedAuthor[]> {
    const res = await api.get("/community/authors/suggested", {
      params: {
        ...(params?.limit ? { limit: params.limit } : {}),
      },
      signal: params?.signal,
    })
    const list = (res.data.result ??
      res.data.data ??
      []) as CommunitySuggestedAuthorApi[]
    return list.map(mapSuggestedAuthor)
  }

  async getAuthorProfile(authorId: number): Promise<CommunityAuthorProfile> {
    const res = await api.get(`/community/authors/${authorId}`)
    return (res.data.result ?? res.data.data) as CommunityAuthorProfile
  }

  async setAuthorFollowing(
    authorId: number,
    following: boolean,
  ): Promise<{ following: boolean; followerCount: number }> {
    const res = await api.put(`/community/authors/${authorId}/follow`, {
      following,
    })
    return (res.data.result ?? res.data.data) as {
      following: boolean
      followerCount: number
    }
  }

  async getAuthorFollowers(
    authorId: number,
  ): Promise<CommunityAuthorSummary[]> {
    const res = await api.get(`/community/authors/${authorId}/followers`)
    return (res.data.result ?? res.data.data ?? []) as CommunityAuthorSummary[]
  }

  async getAuthorFollowing(
    authorId: number,
  ): Promise<CommunityAuthorSummary[]> {
    const res = await api.get(`/community/authors/${authorId}/following`)
    return (res.data.result ?? res.data.data ?? []) as CommunityAuthorSummary[]
  }

  async recordPostView(
    postId: string,
  ): Promise<{ viewed: true; views: number }> {
    const res = await api.put(`/community/posts/${postId}/view`, {
      viewed: true,
    })
    return (res.data.result ?? res.data.data) as { viewed: true; views: number }
  }

  async createPost(post: CreateCommunityPostInput): Promise<CommunityMealPost> {
    const imageObjectPaths =
      post.imageObjectPaths ??
      (post.imageObjectPath ? [post.imageObjectPath] : [])
    const res = await api.post("/community/posts", {
      category: post.category,
      title: post.title,
      description: post.description,
      imageUri: post.imageUri ?? null,
      imageObjectPaths,
      tags: post.tags ?? [],
      vote: post.vote ?? null,
    })
    return mapPost((res.data.result ?? res.data.data) as CommunityMealPostApi)
  }

  async updatePost(
    id: string,
    post: {
      category?: string
      title?: string
      description?: string
      imageUri?: string | null
      imageObjectPaths?: string[]
      tags?: string[]
    },
  ): Promise<CommunityMealPost> {
    const res = await api.put(`/community/posts/${id}`, post)
    return mapPost((res.data.result ?? res.data.data) as CommunityMealPostApi)
  }

  async deletePost(id: string): Promise<void> {
    await api.delete(`/community/posts/${id}`)
  }

  /**
   * ─── 좋아요·북마크는 **절대 상태**를 보낸다(토글이 아니다) ─────────────────
   *
   * 서버는 같은 경로에 두 메서드를 둔다(`sinsin-be-bun/src/domains/community/routes.ts`
   * 의 "좋아요 · 북마크" 절):
   *
   *  - `POST /posts/:id/like` — **토글.** 서버가 지금 상태를 읽어 뒤집는다.
   *  - `PUT  /posts/:id/like  { liked }` — **절대 상태.** 몇 번을 보내도 결과가 같다.
   *
   * 앱이 토글을 쓰는 동안 실제로 나던 사고는 이렇다. axios 타임아웃은 10초인데
   * (`apiClient.ts`) 서버 핸들러는 그 시각을 넘겨서도 계속 돈다. 그래서 12초에 커밋된
   * 요청을 클라이언트는 `ECONNABORTED` 로 본다 — 하트는 되돌아가 꺼지고 DB 는 켜져
   * 있다. 정산의 무효화는 `refetchType:"none"` 이라 그 세션 안에서는 아무도 고쳐 주지
   * 않는다. 그 상태로 한 번 더 누르면 토글은 **꺼진 것을 켜는 대신 켜진 것을 끈다**.
   *
   * 절대 상태로 보내면 같은 상황이 스스로 낫는다: 되돌아간 하트(`liked:false`)에서
   * 다시 누르면 `{liked:true}` 를 보내고, 서버가 이미 true 여도 결과는 true 다.
   * (서버 주석은 "앱이 옮겨오면 POST 를 지운다" 고 적어 두었다 — 이 커밋이 그 이사다.)
   *
   * 돌려주는 것은 지금까지와 같은 서버 확정 `{ liked, likes }` 다. 모양이 어긋나면
   * (옛·모의 서버) `null` — 호출부는 낙관 상태를 그대로 두고 낡음 표시만 해서 다음
   * 자연 재검증이 맞추게 한다.
   */
  async setLiked(
    postId: string,
    liked: boolean,
  ): Promise<{ liked: boolean; likes: number } | null> {
    const res = await api.put(`/community/posts/${postId}/like`, { liked })
    const raw = (res.data.result ?? res.data.data) as
      | { liked?: unknown; likes?: unknown }
      | undefined
    if (!raw || typeof raw.liked !== "boolean" || typeof raw.likes !== "number")
      return null
    return { liked: raw.liked, likes: raw.likes }
  }

  /** 좋아요와 같은 규칙 — `PUT … { bookmarked }`, 확정 `{ bookmarked }`. */
  async setBookmarked(
    postId: string,
    bookmarked: boolean,
  ): Promise<{ bookmarked: boolean } | null> {
    const res = await api.put(`/community/posts/${postId}/bookmark`, {
      bookmarked,
    })
    const raw = (res.data.result ?? res.data.data) as
      | { bookmarked?: unknown }
      | undefined
    if (!raw || typeof raw.bookmarked !== "boolean") return null
    return { bookmarked: raw.bookmarked }
  }

  async castVote(
    postId: string,
    optionIds: number[],
  ): Promise<CommunityPostVote> {
    const res = await api.post(`/community/posts/${postId}/vote`, { optionIds })
    return mapVote(res.data.result ?? res.data.data) as CommunityPostVote
  }

  async reportPost(
    postId: string,
    reason: string,
    description?: string,
  ): Promise<void> {
    await api.post(`/community/posts/${postId}/report`, { reason, description })
  }

  async getComments(postId: string): Promise<CommunityComment[]> {
    const res = await api.get(`/community/posts/${postId}/comments`)
    const list = (res.data.result ??
      res.data.data ??
      []) as CommunityCommentApi[]
    return list.map(mapCommunityComment)
  }

  async createComment(
    postId: string,
    content: string,
    parentCommentId?: string | null,
    mentions: string[] = [],
  ): Promise<CommunityComment> {
    const res = await api.post(`/community/posts/${postId}/comments`, {
      content,
      parentCommentId: parentCommentId ? Number(parentCommentId) : null,
      mentions,
    })
    return mapCommunityComment(
      (res.data.result ?? res.data.data) as CommunityCommentApi,
    )
  }

  async updateComment(
    postId: string,
    commentId: string,
    content: string,
    mentions: string[] = [],
  ): Promise<CommunityComment> {
    const res = await api.patch(
      `/community/posts/${postId}/comments/${commentId}`,
      { content, mentions },
    )
    return mapCommunityComment(
      (res.data.result ?? res.data.data) as CommunityCommentApi,
    )
  }

  async deleteComment(postId: string, commentId: string): Promise<void> {
    await api.delete(`/community/posts/${postId}/comments/${commentId}`)
  }

  /**
   * 댓글 좋아요도 멱등한 쪽이 있다 —
   * `PUT /posts/:postId/comments/:commentId/like { liked }` (같은 라우트 파일).
   * 글 좋아요와 같은 이유로 이쪽을 쓴다(위 `setLiked` 머리말).
   *
   * 옛 구현은 응답을 **버렸다**(`Promise<void>`). 그래서 확정값이 없어 낙관치를
   * 못 덮었고, 정산은 매번 댓글 목록을 통째로 다시 받아야 했다. 서버는 글 좋아요와
   * 같은 모양(`{ liked, likes }`)을 준다.
   */
  async setCommentLiked(
    postId: string,
    commentId: string,
    liked: boolean,
  ): Promise<{ liked: boolean; likes: number } | null> {
    const res = await api.put(
      `/community/posts/${postId}/comments/${commentId}/like`,
      { liked },
    )
    const raw = (res.data.result ?? res.data.data) as
      | { liked?: unknown; likes?: unknown }
      | undefined
    if (!raw || typeof raw.liked !== "boolean" || typeof raw.likes !== "number")
      return null
    return { liked: raw.liked, likes: raw.likes }
  }

  async reportComment(
    postId: string,
    commentId: string,
    reason: string,
    description?: string,
  ): Promise<void> {
    await api.post(`/community/posts/${postId}/comments/${commentId}/report`, {
      reason,
      description,
    })
  }
}

export const communityPostService = new CommunityPostService()
