import { Pressable, StyleSheet } from "react-native"
import { XStack, Text } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"

interface TagChipsProps {
  tags: string[]
  onPressTag?: (tag: string) => void
  onRemoveTag?: (tag: string) => void
}

const COLORS = {
  light: {
    border: "#D8D8DE",
    background: "#F7F7F9",
    text: "#666677",
    remove: "#81818D",
  },
  dark: {
    border: "#4E4F55",
    background: "#2A2A30",
    text: tokens.color.textDarkSub.val,
    remove: "#C5C8CE",
  },
} as const

export function TagChips({ tags, onPressTag, onRemoveTag }: TagChipsProps) {
  const scheme = useAppColorScheme()
  const colors = COLORS[scheme]

  if (tags.length === 0) return null

  return (
    <XStack flexWrap="wrap" gap={6}>
      {tags.map((tag) => {
        const chip = (
          <XStack
            alignItems="center"
            gap={4}
            paddingHorizontal={8}
            paddingVertical={5}
            borderRadius={8}
            borderWidth={StyleSheet.hairlineWidth}
            borderColor={colors.border}
            backgroundColor={colors.background}
          >
            <Text
              fontSize={13}
              lineHeight={17}
              fontWeight="500"
              fontFamily="$body"
              color={colors.text}
            >
              #{tag}
            </Text>
            {onRemoveTag && (
              <Pressable
                onPress={() => onRemoveTag(tag)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`${tag} 태그 삭제`}
              >
                <Icon name="x" size={12} color={colors.remove} />
              </Pressable>
            )}
          </XStack>
        )

        if (!onPressTag) {
          return <XStack key={tag}>{chip}</XStack>
        }

        return (
          <Pressable
            key={tag}
            onPress={() => onPressTag(tag)}
            accessibilityRole="button"
            accessibilityLabel={`${tag} 태그 검색`}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            {chip}
          </Pressable>
        )
      })}
    </XStack>
  )
}
