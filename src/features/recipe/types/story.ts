/** 커뮤니티 스토리 — 하루만 사는 사진 한 장. */

export interface CommunityStoryApi {
  id: number | string
  authorId?: number | null
  authorName: string
  imageUri: string
  caption?: string | null
  likes: number
  liked: boolean
  views: number
  isMine: boolean
  createdAt: string
  expiresAt: string
}

export interface CommunityStory {
  id: string
  authorId: number | null
  authorName: string
  imageUri: string
  caption: string | null
  likes: number
  liked: boolean
  views: number
  isMine: boolean
  createdAt: Date
  expiresAt: Date
}

export type StorySort = "recommended" | "recent"

export interface CreateCommunityStoryInput {
  /** 이미 서버에 있는 사진(식사 기록)이면 URL 을 그대로 보낸다. */
  imageUri?: string | null
  /** 새로 업로드한 사진이면 저장 경로. */
  imageObjectPath?: string | null
  caption?: string | null
}
