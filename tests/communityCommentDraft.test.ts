import {
  hasSubmittableComment,
  prepareCommentReply,
} from "@/src/features/recipe/utils/commentDraft"
import type { CommunityComment } from "@/src/features/recipe/types"

const comment: CommunityComment = {
  id: "1",
  postId: "post",
  parentCommentId: null,
  authorId: 12,
  authorName: "neighbor",
  isMine: false,
  content: "comment",
  mentions: [],
  replies: [],
  likes: 0,
  liked: false,
  isDeleted: false,
  createdAt: new Date(0),
}

test("a reply seed alone is not a comment, but added text is", () => {
  const seed = prepareCommentReply(comment, "withdrawn")
  expect(seed.text).toBe("@neighbor ")
  expect(seed.mentions).toEqual(["neighbor"])
  expect(hasSubmittableComment(seed.text, seed.text)).toBe(false)
  expect(hasSubmittableComment(seed.text + " \n", seed.text)).toBe(false)
  expect(hasSubmittableComment(seed.text + "thank you", seed.text)).toBe(true)
  expect(hasSubmittableComment("thank you", seed.text)).toBe(true)
})

test("withdrawn authors keep a reply target without revealing or tagging their old name", () => {
  const original = { ...comment, authorId: null }
  const seed = prepareCommentReply(original, "탈퇴한 사용자")
  expect(seed.target.id).toBe(original.id)
  expect(seed.target.authorName).toBe("탈퇴한 사용자")
  expect(seed.text).toBe("")
  expect(seed.mentions).toEqual([])
  expect(original.authorName).toBe("neighbor")
})

test("self replies do not create a self mention and edits require a change", () => {
  expect(
    prepareCommentReply({ ...comment, isMine: true }, "withdrawn").text,
  ).toBe("")
  expect(hasSubmittableComment("original", "original")).toBe(false)
  expect(hasSubmittableComment("\n ", "original")).toBe(false)
  expect(hasSubmittableComment("edited", "original")).toBe(true)
})
