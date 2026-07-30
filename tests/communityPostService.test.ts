/* eslint-disable import/first */
jest.mock("../src/services/core/apiClient", () => ({
  api: {},
}))

import {
  mapCommunityComment,
  parseServerDate,
} from "../src/features/recipe/services/communityPostService"

describe("community post service mappers", () => {
  it("maps nested comment API payloads into app models", () => {
    const mapped = mapCommunityComment({
      id: 1,
      postId: 9,
      parentCommentId: null,
      authorId: null,
      authorName: "탈퇴한 사용자",
      content: "삭제된 댓글입니다",
      likes: 2,
      liked: true,
      isDeleted: true,
      createdAt: "2026-06-23T00:00:00",
      updatedAt: "2026-06-23T01:00:00",
      replies: [
        {
          id: 2,
          postId: 9,
          parentCommentId: 1,
          authorId: 3,
          authorName: "답글작성자",
          content: "답글",
          likes: 0,
          liked: false,
          isDeleted: false,
          createdAt: "2026-06-23T02:00:00",
          updatedAt: "2026-06-23T02:00:00",
          replies: [],
        },
      ],
    })

    expect(mapped.id).toBe("1")
    expect(mapped.authorId).toBeNull()
    expect(mapped.isDeleted).toBe(true)
    expect(mapped.createdAt).toBeInstanceOf(Date)
    expect(mapped.replies).toHaveLength(1)
    expect(mapped.replies[0]).toMatchObject({
      id: "2",
      parentCommentId: "1",
      content: "답글",
    })
  })
})

describe("parseServerDate", () => {
  it("타임존 없는 서버 시각은 UTC 로 읽는다 — KST 9시간 오차 방지", () => {
    const parsed = parseServerDate("2026-06-23T00:00:00")
    expect(parsed.getTime()).toBe(Date.UTC(2026, 5, 23, 0, 0, 0))
  })

  it("타임존이 명시된 문자열은 그대로 읽는다", () => {
    expect(parseServerDate("2026-06-23T00:00:00Z").getTime()).toBe(
      Date.UTC(2026, 5, 23),
    )
    expect(parseServerDate("2026-06-23T09:00:00+09:00").getTime()).toBe(
      Date.UTC(2026, 5, 23),
    )
  })

  it("Date 인스턴스는 손대지 않는다", () => {
    const date = new Date()
    expect(parseServerDate(date)).toBe(date)
  })
})
