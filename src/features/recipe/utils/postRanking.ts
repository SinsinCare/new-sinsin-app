/**
 * 인기글·추천글 랭킹. 서버 랭킹 API가 없으므로 전량 로드된 피드 위에서
 * 순수 함수로 계산한다. 시간이 지날수록 점수가 식는 핫 랭킹(HN 방식)이라
 * "좋아요 수 절대값"이 아니라 "지금 뜨거운 글"이 위로 온다.
 */

interface RankablePost {
  id: string
  category: string
  tags: string[]
  likes: number
  comments: number
  createdAt: Date
}

/** 참여도(좋아요 3 : 댓글 2)를 나이(시간)의 거듭제곱으로 식힌다. */
export function getHotScore(
  post: Pick<RankablePost, "likes" | "comments" | "createdAt">,
  now: Date,
): number {
  const ageHours = Math.max(
    0,
    (now.getTime() - post.createdAt.getTime()) / 3_600_000,
  )
  const engagement = post.likes * 3 + post.comments * 2
  return engagement / Math.pow(ageHours + 2, 1.5)
}

/** 참여가 있는 글만, 핫 스코어 내림차순(동률이면 최신순). */
export function rankPopularPosts<T extends RankablePost>(
  posts: T[],
  now: Date,
  limit = 5,
): T[] {
  return posts
    .filter((p) => p.likes + p.comments > 0)
    .map((p) => ({ post: p, score: getHotScore(p, now) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.post.createdAt.getTime() - a.post.createdAt.getTime(),
    )
    .slice(0, limit)
    .map((entry) => entry.post)
}

/**
 * 현재 글과 이어 읽을 글. 태그 겹침 > 같은 카테고리 > 핫 스코어 순으로
 * 신호를 더하고, 아무 신호도 없으면 최신 글로 채운다.
 */
export function rankRelatedPosts<T extends RankablePost>(
  current: Pick<RankablePost, "id" | "category" | "tags">,
  candidates: T[],
  now: Date,
  limit = 3,
): T[] {
  const others = candidates.filter((p) => p.id !== current.id)

  const scored = others
    .map((post) => {
      const sharedTags = post.tags.filter((tag) =>
        current.tags.includes(tag),
      ).length
      const score =
        sharedTags * 4 +
        (post.category === current.category ? 2 : 0) +
        Math.min(getHotScore(post, now), 3)
      return { post, score }
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.post.createdAt.getTime() - a.post.createdAt.getTime(),
    )
    .map((entry) => entry.post)

  if (scored.length >= limit) return scored.slice(0, limit)

  const fallback = others
    .filter((p) => !scored.includes(p))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  return [...scored, ...fallback].slice(0, limit)
}
