import { useEffect, useRef, useState } from "react"
import { Pressable, StyleSheet, TextInput } from "react-native"
import { XStack, YStack } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"
import { mergeCommunityTags } from "@/src/features/recipe/utils/communityTags"
import { TagChips } from "./TagChips"

interface TagInputProps {
  tags: string[]
  onChangeTags: (tags: string[]) => void
}

const COLORS = {
  light: {
    border: "#E5E5EA",
    text: tokens.color.textLight.val,
    placeholder: "#858591",
    icon: "#666677",
  },
  dark: {
    border: "#4E4F55",
    text: tokens.color.textDark.val,
    placeholder: "#858591",
    icon: "#C5C8CE",
  },
} as const

export function TagInput({ tags, onChangeTags }: TagInputProps) {
  const scheme = useAppColorScheme()
  const colors = COLORS[scheme]
  const inputRef = useRef<TextInput>(null)
  const [draft, setDraft] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [])

  const addTags = (values: string[]) => {
    const next = mergeCommunityTags(tags, values)
    onChangeTags(next)
  }

  const commitDraft = () => {
    if (!draft.trim()) return
    addTags([draft])
    setDraft("")
  }

  const handleChangeText = (next: string) => {
    if (/\s/.test(next)) {
      addTags(next.split(/\s+/))
      setDraft("")
      return
    }
    setDraft(next)
  }

  return (
    <YStack
      gap={8}
      paddingTop={12}
      paddingBottom={4}
      style={{
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
      }}
    >
      <TagChips
        tags={tags}
        onRemoveTag={(tag) => onChangeTags(tags.filter((item) => item !== tag))}
      />
      <XStack alignItems="center" gap={8}>
        <Icon name="hashtag" size={18} color={colors.icon} />
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={handleChangeText}
          onSubmitEditing={commitDraft}
          onBlur={commitDraft}
          placeholder="태그"
          placeholderTextColor={colors.placeholder}
          returnKeyType="done"
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.input,
            {
              color: colors.text,
            },
          ]}
        />
        <Pressable
          onPress={commitDraft}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="태그 추가"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Icon name="plus" size={18} color={colors.icon} />
        </Pressable>
      </XStack>
    </YStack>
  )
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    minHeight: 36,
    paddingVertical: 6,
    fontSize: 15,
    lineHeight: 20,
  },
})
