import { ScrollView, Pressable, StyleSheet } from "react-native"
import { useTranslation } from "react-i18next"

import { useV2Theme, V2HStack, V2Text } from "@/src/design-system-v2"
import type { ChatCategory } from "@/src/types/chat"
import { getLocalizedQuickQuestions } from "../data/mockData"

interface QuickQuestionChipsProps {
  category: ChatCategory
  onSelect: (text: string) => void
  disabled?: boolean
}

export function QuickQuestionChips({
  category,
  onSelect,
  disabled,
}: QuickQuestionChipsProps) {
  const { i18n } = useTranslation("common")
  const { colors } = useV2Theme()
  const questions = getLocalizedQuickQuestions(
    category,
    i18n.resolvedLanguage ?? i18n.language,
  )

  if (questions.length === 0) return null

  return (
    <ScrollView
      bounces={false}
      overScrollMode="never"
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.list}
    >
      {questions.map((q) => (
        <Pressable
          key={q.id}
          onPress={() => !disabled && onSelect(q.text)}
          style={{ opacity: disabled ? 0.5 : 1 }}
        >
          {/*
            테마 토큰 대응(themes.ts):
              $grey8      → 옅은 선   = line.normal
              $background → 바탕 면   = background.default
              $grey3      → 본문 글자 = label.normal
            `borderRadius="$10"` 은 radius 스케일 24 — 칩 높이(약 32)에서 pill 로 보인다.
          */}
          <V2HStack
            paddingHorizontal={12}
            paddingVertical={8}
            style={[
              styles.chip,
              {
                borderColor: colors.line.normal,
                backgroundColor: colors.background.default,
              },
            ]}
          >
            <V2Text token="caption.medium" color={colors.label.normal}>
              {q.text}
            </V2Text>
          </V2HStack>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: { borderRadius: 24, borderWidth: 1 },
})
