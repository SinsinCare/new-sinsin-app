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
  /**
   * 글쓴이의 사람 id. **세 값이 서로 다른 뜻이다** — 숫자는 그 사람, `null` 은 탈퇴
   * (서버 익명화), `undefined` 는 **서버가 안 보냈다**. 매퍼가 뒤 둘을 뭉개면
   * `isWithdrawnAuthor` 가 전원을 탈퇴자로 읽어 차단 필터가 꺼진다
   * (`communityStoryService.mapCommunityStory` 머리말). 글·댓글과 같은 모양이다.
   */
  authorId?: number | null
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
