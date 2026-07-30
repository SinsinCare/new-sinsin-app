import {
  getHotScore,
  rankPopularPosts,
  rankRelatedPosts,
} from "@/src/features/recipe/utils/postRanking"

const NOW = new Date("2026-07-27T12:00:00Z")

function post(
  id: string,
  overrides: Partial<{
    category: string
    tags: string[]
    likes: number
    comments: number
    ageHours: number
  }> = {},
) {
  const {
    category = "diet",
    tags = [],
    likes = 0,
    comments = 0,
    ageHours = 1,
  } = overrides
  return {
    id,
    category,
    tags,
    likes,
    comments,
    createdAt: new Date(NOW.getTime() - ageHours * 3_600_000),
  }
}

describe("getHotScore", () => {
  it("같은 참여도면 최신 글이 더 뜨겁다", () => {
    const fresh = post("a", { likes: 10, ageHours: 1 })
    const stale = post("b", { likes: 10, ageHours: 48 })
    expect(getHotScore(fresh, NOW)).toBeGreaterThan(getHotScore(stale, NOW))
  })

  it("미래 시각(시계 오차)은 나이 0으로 클램프한다", () => {
    const future = post("a", { likes: 5, ageHours: -2 })
    const now = post("b", { likes: 5, ageHours: 0 })
    expect(getHotScore(future, NOW)).toBe(getHotScore(now, NOW))
  })
})

describe("rankPopularPosts", () => {
  it("참여가 없는 글은 인기글이 되지 않는다", () => {
    const ranked = rankPopularPosts([post("a"), post("b", { likes: 1 })], NOW)
    expect(ranked.map((p) => p.id)).toEqual(["b"])
  })

  it("오래된 대박글보다 지금 달아오르는 글이 위로 온다", () => {
    const oldHit = post("old", { likes: 30, ageHours: 24 * 7 })
    const rising = post("rising", { likes: 6, comments: 2, ageHours: 2 })
    const ranked = rankPopularPosts([oldHit, rising], NOW)
    expect(ranked[0].id).toBe("rising")
  })

  it("limit 만큼만 돌려준다", () => {
    const posts = [
      post("a", { likes: 3 }),
      post("b", { likes: 2 }),
      post("c", { likes: 1 }),
    ]
    expect(rankPopularPosts(posts, NOW, 2)).toHaveLength(2)
  })
})

describe("rankRelatedPosts", () => {
  it("태그 겹침이 같은 카테고리보다 세다", () => {
    const current = post("cur", { category: "diet", tags: ["저염식"] })
    const sameCategory = post("cat", { category: "diet" })
    const sharedTag = post("tag", { category: "daily", tags: ["저염식"] })
    const ranked = rankRelatedPosts(current, [sameCategory, sharedTag], NOW)
    expect(ranked[0].id).toBe("tag")
  })

  it("자기 자신은 추천하지 않는다", () => {
    const current = post("cur", { category: "diet" })
    const ranked = rankRelatedPosts(current, [current, post("b")], NOW)
    expect(ranked.map((p) => p.id)).not.toContain("cur")
  })

  it("신호가 없으면 최신 글로 채운다", () => {
    const current = post("cur", { category: "diet", tags: [] })
    const older = post("older", { category: "daily", ageHours: 10 })
    const newer = post("newer", { category: "numbers", ageHours: 1 })
    const ranked = rankRelatedPosts(current, [older, newer], NOW, 2)
    expect(ranked.map((p) => p.id)).toEqual(["newer", "older"])
  })
})
