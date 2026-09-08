import type { CommunityComment } from "../types"
export type CommentOrder = "oldest" | "newest" | "popular"
/** Sort top-level discussions only; replies remain attached in conversation order. */
export function orderComments(
  comments: CommunityComment[],
  order: CommentOrder,
) {
  if (order === "oldest") return comments
  return [...comments].sort((a, b) => {
    if (order === "popular" && a.likes !== b.likes) return b.likes - a.likes
    return b.createdAt.getTime() - a.createdAt.getTime()
  })
}
