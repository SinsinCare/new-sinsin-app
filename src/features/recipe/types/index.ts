export interface CommunityPostVoteCreate {
  /** 투표 질문(선택). */
  title?: string | null
  options: string[]
  allowMultiple: boolean
}

export interface CommunityPostVoteOption {
  id: number
  text: string
  count: number
}

export interface CommunityPostVote {
  id: number
  /** 투표 질문(선택). */
  title: string | null
  allowMultiple: boolean
  options: CommunityPostVoteOption[]
  totalCount: number
  myVote: number[] | null
}

export interface CommunityCommentApi {
  id: string | number
  postId: string | number
  parentCommentId?: string | number | null
  authorId?: number | null
  /** 서버가 내려주는 소유자 판정. 앱이 다시 계산하지 않는다 — `contentOwnership` 참고. */
  isMine?: boolean | null
  authorName: string
  content: string
  mentions?: string[] | null
  likes: number
  liked: boolean
  isDeleted: boolean
  createdAt: string | number | Date
  updatedAt?: string | number | Date
  replies?: CommunityCommentApi[]
}

export interface CommunityComment {
  id: string
  postId: string
  parentCommentId: string | null
  authorId?: number | null
  /** 서버가 내려주는 소유자 판정(옛 서버면 undefined). `isMyContent()` 로만 읽을 것. */
  isMine?: boolean | null
  authorName: string
  content: string
  /** 본문의 '@닉네임' 중 서버가 실제 참여자로 확인한 것만. */
  mentions: string[]
  likes: number
  liked: boolean
  isDeleted: boolean
  createdAt: Date
  updatedAt?: Date
  replies: CommunityComment[]
}

/** Backend / API payload before mapping to {@link CommunityMealPost}. */
export interface CommunityMealPostApi {
  id: string | number
  authorId?: number | null
  isMine?: boolean | null
  authorName: string
  authorRole: string
  category: string
  imageUri?: string | null
  imageUris?: string[] | null
  imageObjectPaths?: string[] | null
  title: string
  description: string
  likes: number
  liked: boolean
  comments: number
  views?: number | null
  rank?: number | null
  bookmarked: boolean
  createdAt: string | number | Date
  updatedAt?: string | number | Date
  tags?: string[] | null
  vote?: CommunityPostVote | null
}

export interface CommunityMealPost {
  id: string
  authorId?: number | null
  /** 서버가 내려주는 소유자 판정(옛 서버면 undefined). `isMyContent()` 로만 읽을 것. */
  isMine?: boolean | null
  authorName: string
  authorRole: string
  category: string
  /** 첫 이미지(하위호환). 렌더는 imageUris 를 쓴다. */
  imageUri: string | null
  imageUris: string[]
  /** 수정 시 이미지 세트를 되돌려 보내기 위한 저장 경로. */
  imageObjectPaths: string[]
  title: string
  description: string
  likes: number
  liked: boolean
  comments: number
  views?: number | null
  rank?: number | null
  bookmarked: boolean
  createdAt: Date
  updatedAt?: Date
  tags: string[]
  vote: CommunityPostVote | null
}

export interface CommunityAuthorSummary {
  id: number
  nickName: string
  profileImageUrl: string | null
}

export interface CommunityAuthorProfile extends CommunityAuthorSummary {
  postCount: number
  followerCount: number
  followingCount: number
  isFollowing: boolean
  isMine: boolean
  badges: string[]
}

/**
 * **추천 작성자 한 명** — `GET /api/v1/community/authors/suggested`(리디자인 E1).
 * 그리는 곳: `NeighborSuggestionSection`(`비슷한 단계의 이웃`, D24·D25).
 *
 * 서버 정본(`PublicAuthorProfilePayload`)의 **투영**이라 필드 이름이 작성자 프로필과
 * 글자까지 같다. 서버가 `Pick<...>` 으로 판 이유가 그것이고(같은 개념에 이름이 두 벌
 * 생기면 화면마다 매퍼가 갈린다), 앱도 같은 이유로 `CommunityAuthorSummary` 를 넓힌다.
 */
export interface CommunitySuggestedAuthor extends CommunityAuthorSummary {
  /** 내가 이미 팔로우 중인가. 서버는 팔로우한 사람을 후보에서 빼지만, 낙관 토글 뒤에는 참이 된다. */
  isFollowing: boolean
  /** 단계·주제 배지. 서버는 최대 4개를 싣고 **자르는 쪽은 화면**이다(서버 머리말). */
  badges: string[]

  /**
   * **이 사람의 최근 글 제목 한 줄** — `NeighborSuggestionSection` 이 존재하는 이유다
   * (D25: "정작 판단 근거인 *이 사람이 뭘 쓰는가* 가 없다").
   *
   * **오늘의 서버는 이 칸을 안 보낸다.** `SuggestedAuthorPayload` 는
   * `id|nickName|profileImageUrl|isFollowing|badges` 다섯 칸뿐이라 여기는 `null` 로 온다.
   * 그래서 타입이 `| null` 이고, 화면은 **모르는 행을 그리지 않는다** — 없는 제목을
   * 피드 캐시에서 주워 채우면 "같은 블록의 두 행 중 하나만 근거가 있는" 화면이 되고,
   * 그건 조용한 폴백이다(집안 규칙: 예측 가능한 UX > 폴백).
   *
   * 서버가 이 칸을 싣는 날 앱은 **한 줄도 안 고치고** 켜진다.
   */
  latestPostTitle: string | null
}

/** 서버가 보내는 원형. 옛/새 서버를 같은 매퍼로 읽으려고 전 칸이 선택이다. */
export interface CommunitySuggestedAuthorApi {
  id: number | string
  nickName: string
  profileImageUrl?: string | null
  isFollowing?: boolean | null
  badges?: string[] | null
  latestPostTitle?: string | null
}

export type CommunityPopularPeriod = "realtime" | "week" | "month"

/** 피드 정렬. 서버가 정렬한다 — 클라이언트 핫스코어 정렬은 피드에서 은퇴했다. */
export type CommunitySortMode = "recent" | "views" | "popular"

/** 커서 페이지 한 장. `nextCursor` 는 `x-next-cursor` 응답 헤더에서 온다(없으면 끝). */
export interface CommunityPostsPage {
  posts: CommunityMealPost[]
  nextCursor: string | null
}

/** 최근 7일 검색 로그 집계. rank 는 1부터. */
export interface PopularSearchKeyword {
  keyword: string
  count: number
  rank: number
}

export type CreateCommunityPostInput = Omit<
  CommunityMealPost,
  | "id"
  | "likes"
  | "liked"
  | "comments"
  | "bookmarked"
  | "createdAt"
  | "tags"
  | "vote"
  | "imageUris"
  | "imageObjectPaths"
> & {
  imageObjectPath?: string | null
  imageObjectPaths?: string[]
  tags?: string[]
  vote?: CommunityPostVoteCreate | null
}

export interface ICommunityPostService {
  getPosts(params?: {
    tag?: string | null
    category?: string | null
    sort?: CommunitySortMode
    cursor?: string | null
    limit?: number
  }): Promise<CommunityPostsPage>
  searchPosts(params: {
    q: string
    cursor?: string | null
    limit?: number
  }): Promise<CommunityPostsPage>
  getPopularSearchKeywords(limit?: number): Promise<PopularSearchKeyword[]>
  getPost(id: string): Promise<CommunityMealPost | undefined>
  createPost(post: CreateCommunityPostInput): Promise<CommunityMealPost>
  updatePost(
    id: string,
    post: {
      category?: string
      title?: string
      description?: string
      imageUri?: string | null
      imageObjectPaths?: string[]
      tags?: string[]
    },
  ): Promise<CommunityMealPost>
  deletePost(id: string): Promise<void>
  /**
   * **절대 상태를 보내고** 서버 확정 상태를 받는다(토글이 아니다 — 구현 머리말 참고).
   * 모양이 어긋나는 옛/모의 서버면 `null`.
   */
  setLiked(
    postId: string,
    liked: boolean,
  ): Promise<{ liked: boolean; likes: number } | null>
  setBookmarked(
    postId: string,
    bookmarked: boolean,
  ): Promise<{ bookmarked: boolean } | null>
  castVote(postId: string, optionIds: number[]): Promise<CommunityPostVote>
  reportPost(
    postId: string,
    reason: string,
    description?: string,
  ): Promise<void>
  getComments(postId: string): Promise<CommunityComment[]>
  createComment(
    postId: string,
    content: string,
    parentCommentId?: string | null,
    mentions?: string[],
  ): Promise<CommunityComment>
  updateComment(
    postId: string,
    commentId: string,
    content: string,
    mentions?: string[],
  ): Promise<CommunityComment>
  deleteComment(postId: string, commentId: string): Promise<void>
  /** 글 좋아요와 같은 규칙 — 절대 상태를 보내고 서버 확정 `{ liked, likes }` 를 받는다. */
  setCommentLiked(
    postId: string,
    commentId: string,
    liked: boolean,
  ): Promise<{ liked: boolean; likes: number } | null>
  reportComment(
    postId: string,
    commentId: string,
    reason: string,
    description?: string,
  ): Promise<void>
}

export interface PostCategory {
  key: string
  label: string
}
