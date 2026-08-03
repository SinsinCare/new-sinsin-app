import { api } from "@/src/services/core/apiClient"
import {
  CommunityComment,
  CommunityCommentApi,
  CommunityMealPost,
  CommunityMealPostApi,
  CommunityPostVote,
  CreateCommunityPostInput,
  ICommunityPostService,
} from "../types"

/**
 * 서버가 타임존 표기 없는 UTC(naive) ISO 문자열을 내려준다.
 * 그대로 new Date() 에 넣으면 로컬 시각으로 읽혀 KST 에서 9시간 어긋난다.
 */
export function parseServerDate(value: string | number | Date): Date {
  if (value instanceof Date) return value
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) &&
    !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
  ) {
    return new Date(`${value}Z`)
  }
  return new Date(value)
}

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

function mapPost(raw: CommunityMealPostApi): CommunityMealPost {
  const imageUris =
    raw.imageUris && raw.imageUris.length > 0
      ? raw.imageUris
      : raw.imageUri
        ? [raw.imageUri]
        : []
  return {
    id: String(raw.id),
    authorId: raw.authorId ?? null,
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
    bookmarked: raw.bookmarked,
    createdAt: parseServerDate(raw.createdAt),
    updatedAt: raw.updatedAt ? parseServerDate(raw.updatedAt) : undefined,
    tags: raw.tags ?? [],
    vote: mapVote(raw.vote),
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
    authorId: raw.authorId ?? null,
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

class CommunityPostService implements ICommunityPostService {
  async getPosts(params?: {
    tag?: string | null
  }): Promise<CommunityMealPost[]> {
    const res = await api.get("/community/posts", {
      params: params?.tag ? { tag: params.tag } : undefined,
    })
    const list = (res.data.result ??
      res.data.data ??
      []) as CommunityMealPostApi[]
    return list.map(mapPost)
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

  async toggleLike(postId: string): Promise<void> {
    await api.post(`/community/posts/${postId}/like`)
  }

  async toggleBookmark(postId: string): Promise<void> {
    await api.post(`/community/posts/${postId}/bookmark`)
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

  async toggleCommentLike(postId: string, commentId: string): Promise<void> {
    await api.post(`/community/posts/${postId}/comments/${commentId}/like`)
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
