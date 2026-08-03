import { useEffect, useRef, useState } from "react"
import { Pressable, StyleSheet, TextInput, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useSurface } from "@/src/hooks/useSurface"
import { Icon } from "@/src/shared/components/Icon"
import { mergeCommunityTags } from "@/src/features/recipe/utils/communityTags"
import { TagChips } from "./TagChips"
import { useTranslation } from "react-i18next"

interface TagInputProps {
  tags: string[]
  onChangeTags: (tags: string[]) => void
}

export function TagInput({ tags, onChangeTags }: TagInputProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()
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
    <View style={[styles.wrap, { borderTopColor: surface.hairline }]}>
      <TagChips
        tags={tags}
        onRemoveTag={(tag) => onChangeTags(tags.filter((item) => item !== tag))}
      />
      <View style={styles.inputRow}>
        <Icon name="hashtag" size={17} color={surface.textMuted} />
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={handleChangeText}
          onSubmitEditing={commitDraft}
          onBlur={commitDraft}
          placeholder={t("tag.placeholder")}
          placeholderTextColor={surface.placeholder}
          maxLength={21}
          returnKeyType="done"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: surface.textStrong }]}
        />
        <Pressable
          onPress={commitDraft}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("tag.add")}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Ionicons name="add" size={19} color={surface.textMuted} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 36,
    paddingVertical: 6,
    fontSize: 15,
    letterSpacing: -0.3,
    // 단일행 입력엔 lineHeight 를 주지 않는다 — iOS 가 글자를 문단 기준으로 앉혀
    // 상하 여백이 어긋난다(surface.ts `singleLineInputText` 머리말).
    includeFontPadding: false,
    fontFamily: "Pretendard-Regular",
  },
})
