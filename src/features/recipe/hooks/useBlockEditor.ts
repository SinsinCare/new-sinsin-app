import { useState, useCallback } from "react"
import type { ContentBlock } from "@/src/features/recipe/types"

const INITIAL_BLOCKS: ContentBlock[] = [{ type: "text", content: "" }]

export function useBlockEditor(initialBlocks: ContentBlock[] = INITIAL_BLOCKS) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(initialBlocks)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [cursorPosition, setCursorPosition] = useState(0)

  const updateTextBlock = useCallback((index: number, text: string) => {
    setBlocks((prev) => {
      const next = [...prev]
      const block = next[index]
      if (block.type === "text") {
        next[index] = { ...block, content: text }
      }
      return next
    })
  }, [])

  const insertImage = useCallback(
    (imageUri: string) => {
      setBlocks((prev) => {
        const next = [...prev]
        const focused = next[focusedIndex]

        if (focused?.type === "text") {
          const before = focused.content.slice(0, cursorPosition)
          const after = focused.content.slice(cursorPosition)

          next.splice(
            focusedIndex,
            1,
            { type: "text", content: before },
            { type: "image", localUri: imageUri, isUploading: false },
            { type: "text", content: after },
          )
        } else {
          next.push(
            { type: "image", localUri: imageUri, isUploading: false },
            { type: "text", content: "" },
          )
        }

        return next
      })
    },
    [focusedIndex, cursorPosition],
  )

  const insertImages = useCallback(
    (imageUris: string[]) => {
      if (imageUris.length === 0) return

      setBlocks((prev) => {
        const next = [...prev]
        const imageBlocks: ContentBlock[] = imageUris.map((uri) => ({
          type: "image",
          localUri: uri,
          isUploading: false,
        }))
        const focused = next[focusedIndex]

        if (focused?.type === "text") {
          const before = focused.content.slice(0, cursorPosition)
          const after = focused.content.slice(cursorPosition)
          const replacement: ContentBlock[] = [
            ...(before ? [{ type: "text" as const, content: before }] : []),
            ...imageBlocks,
            { type: "text", content: after },
          ]

          next.splice(focusedIndex, 1, ...replacement)
        } else {
          next.push(...imageBlocks, { type: "text", content: "" })
        }

        return next
      })
    },
    [focusedIndex, cursorPosition],
  )

  const deleteImage = useCallback((index: number) => {
    setBlocks((prev) => {
      const next = [...prev]
      const prevBlock = next[index - 1]
      const nextBlock = next[index + 1]

      next.splice(index, 1)

      // Merge adjacent text blocks
      if (prevBlock?.type === "text" && nextBlock?.type === "text") {
        const mergedIdx = index - 1
        next[mergedIdx] = {
          type: "text",
          content: prevBlock.content + nextBlock.content,
        }
        next.splice(index, 1)
      }

      // Ensure at least one text block
      if (next.length === 0) {
        next.push({ type: "text", content: "" })
      }

      return next
    })
  }, [])

  const hasContent = blocks.some(
    (b) =>
      (b.type === "text" && b.content.trim().length > 0) || b.type === "image",
  )

  const imageCount = blocks.filter((b) => b.type === "image").length

  const hasUploadingImages = blocks.some(
    (b) => b.type === "image" && b.isUploading,
  )

  return {
    blocks,
    setBlocks,
    focusedIndex,
    setFocusedIndex,
    cursorPosition,
    setCursorPosition,
    updateTextBlock,
    insertImage,
    insertImages,
    deleteImage,
    hasContent,
    imageCount,
    hasUploadingImages,
  }
}
