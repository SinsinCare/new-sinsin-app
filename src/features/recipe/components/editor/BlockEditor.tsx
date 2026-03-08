import { View, useColorScheme, StyleSheet } from "react-native"
import type { ContentBlock } from "@/src/features/recipe/types"
import { TextBlock } from "./TextBlock"
import { ImageBlock } from "./ImageBlock"

const BORDER_COLOR = { light: "#E5E5EA", dark: "#1F1F21" }
const BG_COLOR = { light: "#FFFFFF", dark: "#1F1F24" }

interface BlockEditorProps {
  blocks: ContentBlock[]
  placeholder?: string
  onPreviewImage?: (uri: string) => void
  onFocusedIndexChange: (index: number) => void
  onCursorPositionChange: (position: number) => void
  onUpdateTextBlock: (index: number, text: string) => void
  onDeleteImage: (index: number) => void
  onEditorFocus?: () => void
  onEditorBlur?: () => void
}

export function BlockEditor({
  blocks,
  placeholder,
  onPreviewImage,
  onFocusedIndexChange,
  onCursorPositionChange,
  onUpdateTextBlock,
  onDeleteImage,
  onEditorFocus,
  onEditorBlur,
}: BlockEditorProps) {
  const scheme = useColorScheme() ?? "light"

  const hasNonEmptyContent = blocks.some(
    (b) =>
      (b.type === "text" && b.content.trim().length > 0) ||
      b.type === "image",
  )

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: BORDER_COLOR[scheme],
          backgroundColor: BG_COLOR[scheme],
        },
      ]}
    >
      {blocks.map((block, index) => {
        if (block.type === "text") {
          return (
            <TextBlock
              key={`text-${index}`}
              content={block.content}
              onChange={(text) => onUpdateTextBlock(index, text)}
              onSelectionChange={(pos) => onCursorPositionChange(pos)}
              onFocus={() => {
                onFocusedIndexChange(index)
                onEditorFocus?.()
              }}
              onBlur={onEditorBlur}
              placeholder={index === 0 && !hasNonEmptyContent ? placeholder : undefined}
            />
          )
        }

        if (block.type === "image") {
          return (
            <ImageBlock
              key={`image-${index}-${block.localUri}`}
              localUri={block.localUri}
              isUploading={block.isUploading}
              uploadFailed={block.uploadFailed}
              onDelete={() => onDeleteImage(index)}
              onPress={() => onPreviewImage?.(block.localUri)}
            />
          )
        }

        return null
      })}
    </View>
  )
}

export type { BlockEditorProps }

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 100,
    overflow: "hidden",
  },
})
