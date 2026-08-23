/**
 * 이어 읽을 글(연관 추천) 랭킹. 순수 함수라 상세 화면(`app/post/[id].tsx`)이
 * 로드해 둔 후보 위에서 계산한다. 시간이 지날수록 점수가 식는 핫 스코어(HN 방식)를
 * 신호 하나로 섞는다 — "좋아요 수 절대값"이 아니라 "지금 뜨거운 글"이 위로 온다.
 *
 * 인기글 랭킹(`rankPopularPosts`)은 은퇴했다 — 피드가 커서 페이지로 바뀌며 "전량
 * 로드된 피드" 가 사라졌고, 인기글은 서버 인기 API(`/community/posts/popular`)가 정본이다.
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
