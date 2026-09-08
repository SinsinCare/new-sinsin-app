import type { CommunityComment } from "../types"
import { isMyContent, isWithdrawnAuthor } from "./contentOwnership"

export function hasSubmittableComment(text: string, baseline: string): boolean {
  return text.trim().length > 0 && text.trim() !== baseline.trim()
}

/** A withdrawn account's old display name must never seed a fresh reply. */
export function prepareCommentReply(
  comment: CommunityComment,
  withdrawnLabel: string,
  myNickname?: string | null,
) {
  const withdrawn = isWithdrawnAuthor(comment)
  const mention = !withdrawn && !isMyContent(comment, myNickname)
  return {
    target: withdrawn ? { ...comment, authorName: withdrawnLabel } : comment,
    text: mention ? `@${comment.authorName} ` : "",
    mentions: mention ? [comment.authorName] : [],
  }
}
