import { orderComments } from "@/src/features/recipe/utils/commentOrder"
import type { CommunityComment } from "@/src/features/recipe/types"

const comment = (
  id: string,
  date: number,
  likes: number,
): CommunityComment => ({
  id,
  postId: "p",
  parentCommentId: null,
  authorName: "tester",
  content: id,
  mentions: [],
  likes,
  liked: false,
  isDeleted: false,
  createdAt: new Date(date),
  replies: [],
})

test("sorting conversations never mutates the cache or reorders replies", () => {
  const older = comment("a", 100, 2),
    newer = comment("b", 300, 1),
    popular = comment("c", 200, 5)
  older.replies = [comment("reply-a", 400, 0), comment("reply-b", 500, 9)]
  const input = [older, popular, newer]
  expect(orderComments(input, "oldest")).toBe(input)
  expect(orderComments(input, "newest").map((c) => c.id)).toEqual([
    "b",
    "c",
    "a",
  ])
  expect(orderComments(input, "popular").map((c) => c.id)).toEqual([
    "c",
    "a",
    "b",
  ])
  expect(input.map((c) => c.id)).toEqual(["a", "c", "b"])
  expect(orderComments(input, "popular")[1].replies).toBe(older.replies)
  expect(older.replies.map((c) => c.id)).toEqual(["reply-a", "reply-b"])
})

test("equal likes are resolved by recency and equal dates stay stable", () => {
  const input = [
    comment("a", 100, 3),
    comment("b", 200, 3),
    comment("c", 200, 3),
  ]
  expect(orderComments(input, "popular").map((c) => c.id)).toEqual([
    "b",
    "c",
    "a",
  ])
})
