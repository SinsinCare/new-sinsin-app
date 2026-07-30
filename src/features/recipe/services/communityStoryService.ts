import { api } from "@/src/services/core/apiClient"
import { parseServerDate } from "./communityPostService"
import type {
  CommunityStory,
  CommunityStoryApi,
  CreateCommunityStoryInput,
  StorySort,
} from "../types/story"

export function mapCommunityStory(raw: CommunityStoryApi): CommunityStory {
  return {
    id: String(raw.id),
    authorId: raw.authorId ?? null,
    authorName: raw.authorName,
    imageUri: raw.imageUri,
    caption: raw.caption ?? null,
    likes: Number(raw.likes ?? 0),
    liked: Boolean(raw.liked),
    views: Number(raw.views ?? 0),
    isMine: Boolean(raw.isMine),
    createdAt: parseServerDate(raw.createdAt),
    expiresAt: parseServerDate(raw.expiresAt),
  }
}

class CommunityStoryService {
  async getStories(sort: StorySort = "recommended"): Promise<CommunityStory[]> {
    const res = await api.get("/community/stories", { params: { sort } })
    const list = (res.data.result ?? res.data.data ?? []) as CommunityStoryApi[]
    return list.map(mapCommunityStory)
  }

  async createStory(input: CreateCommunityStoryInput): Promise<CommunityStory> {
    const res = await api.post("/community/stories", {
      imageUri: input.imageUri ?? null,
      imageObjectPath: input.imageObjectPath ?? null,
      caption: input.caption ?? null,
    })
    return mapCommunityStory(
      (res.data.result ?? res.data.data) as CommunityStoryApi,
    )
  }

  async deleteStory(storyId: string): Promise<void> {
    await api.delete(`/community/stories/${storyId}`)
  }

  async toggleLike(storyId: string): Promise<void> {
    await api.post(`/community/stories/${storyId}/like`)
  }

  /** 조회 기록은 부가 정보다 — 실패해도 화면 흐름을 막지 않는다. */
  async recordView(storyId: string): Promise<void> {
    try {
      await api.post(`/community/stories/${storyId}/view`)
    } catch {
      // 조회수는 유실돼도 사용자에게 알릴 일이 아니다.
    }
  }
}

export const communityStoryService = new CommunityStoryService()
