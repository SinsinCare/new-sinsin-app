import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { borderWidth } from "@/src/design-system-v2/tokens/size"
import { useEffect, useRef, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useSurface } from "@/src/hooks/useSurface"
import { Icon } from "@/src/shared/components/Icon"
import {
  MAX_COMMUNITY_TAGS,
  MAX_COMMUNITY_TAG_INPUT_LENGTH,
  MAX_COMMUNITY_TAG_LENGTH,
  hasCommunityTagSpace,
  mergeCommunityTags,
  splitCommunityTagInput,
  type TagRefusalReason,
} from "@/src/features/recipe/utils/communityTags"
import { showInfoToast } from "@/src/lib/toast"
import { TagChips } from "./TagChips"
import { useTranslation } from "react-i18next"

interface TagInputProps {
  tags: string[]
  onChangeTags: (tags: string[]) => void
  /**
   * 마운트 직후 입력칸에 커서를 넣을지. **기본은 끔.**
   *
   * 켜 두면 자유글 쓰기를 여는 것만으로 제목이 아니라 **태그 칸**에 키보드가 뜬다.
   * 이 자동 포커스가 필요한 곳은 수정 화면처럼 "태그 달기" 를 눌러 이 줄을 방금
   * 펼친 자리뿐이다 — 그 화면이 직접 켠다.
   */
  autoFocus?: boolean
}

export function TagInput({
  tags,
  onChangeTags,
  autoFocus = false,
}: TagInputProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()
  const inputRef = useRef<TextInput>(null)
  const [draft, setDraft] = useState("")

  useEffect(() => {
    if (!autoFocus) return
    const timer = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [autoFocus])

  /**
   * 거절당한 태그는 **말해 준다.** 예전에는 아무 말 없이 사라져서, 사용자에게는
   * "추가 버튼이 안 눌린다" 로 보였다(길이·공백) 또는 아무 일도 없이 넘어갔다가
   * 사진까지 다 올린 뒤 400 이 났다(개수 상한).
   */
  const notifyRefusal = (reason: TagRefusalReason) => {
    if (reason === "limit") {
      showInfoToast(
        t("tag.refusedLimitTitle", { max: MAX_COMMUNITY_TAGS }),
        t("tag.refusedLimitBody"),
      )
      return
    }
    if (reason === "tooLong") {
      showInfoToast(
        t("tag.refusedTooLongTitle"),
        t("tag.refusedTooLongBody", { max: MAX_COMMUNITY_TAG_LENGTH }),
      )
      return
    }
    showInfoToast(t("tag.refusedInvalidTitle"), t("tag.refusedInvalidBody"))
  }

  const addTags = (values: string[]) => {
    const merged = mergeCommunityTags(tags, values)
    onChangeTags(merged.tags)
    if (merged.refusal) notifyRefusal(merged.refusal)
  }

  const commitDraft = () => {
    if (!draft.trim()) return
    addTags([draft])
    setDraft("")
  }

  const handleChangeText = (next: string) => {
    // 나누는 기준은 서버의 공백 집합이다(`communityTags` 머리말). JS `\s` 로 나누면
    // 서버가 한 태그로 보는 자리에서 쪼개고, 서버가 400 을 내는 자리에서는 안 쪼갠다.
    if (hasCommunityTagSpace(next)) {
      addTags(splitCommunityTagInput(next))
      setDraft("")
      return
    }
    setDraft(next)
  }

  return (
    <View style={[styles.wrap, { borderTopColor: surface.border }]}>
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
          maxLength={MAX_COMMUNITY_TAG_INPUT_LENGTH}
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
    borderTopWidth: borderWidth.thin,
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
