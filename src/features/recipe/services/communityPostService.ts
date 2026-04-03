import { api } from "@/src/services/core/apiClient"
import { ApiError } from "@/src/services/core/apiError"
import {
  CommunityMealPost,
  CommunityMealPostApi,
  ICommunityPostService,
} from "../types"

function mapPost(raw: CommunityMealPostApi): CommunityMealPost {
  return {
    id: String(raw.id),
    authorId: raw.authorId,
    authorName: raw.authorName,
    authorRole: raw.authorRole,
    category: raw.category,
    imageUri: raw.imageUri ?? null,
    title: raw.title,
    description: raw.description,
    likes: raw.likes,
    liked: raw.liked,
    comments: raw.comments,
    bookmarked: raw.bookmarked,
    createdAt: new Date(raw.createdAt),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : undefined,
  }
}

class CommunityPostService implements ICommunityPostService {
  async getPosts(): Promise<CommunityMealPost[]> {
    const res = await api.get("/community/posts")
    const list = (res.data.result ??
      res.data.data ??
      []) as CommunityMealPostApi[]
    return list.map(mapPost)
  }

  async getPost(id: string): Promise<CommunityMealPost | undefined> {
    try {
      const res = await api.get(`/community/posts/${id}`)
      const raw = res.data.result ?? res.data.data
      return raw ? mapPost(raw as CommunityMealPostApi) : undefined
    } catch (e) {
      if (e instanceof ApiError && e.statusCode === 404) {
        return undefined
      }
      throw e
    }
  }

  async createPost(
    post: Omit<
      CommunityMealPost,
      "id" | "likes" | "liked" | "comments" | "bookmarked" | "createdAt"
    >,
  ): Promise<CommunityMealPost> {
    const res = await api.post("/community/posts", {
      category: post.category,
      title: post.title,
      description: post.description,
      imageUri: post.imageUri,
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

  async reportPost(
    postId: string,
    reason: string,
    description?: string,
  ): Promise<void> {
    await api.post(`/community/posts/${postId}/report`, { reason, description })
  }
}

export const communityPostService = new CommunityPostService()
