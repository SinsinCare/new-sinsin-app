import { Pressable, StyleSheet, Text, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useSurface } from "@/src/hooks/useSurface"
import { useTranslation } from "react-i18next"

interface TagChipsProps {
  tags: string[]
  onPressTag?: (tag: string) => void
  onRemoveTag?: (tag: string) => void
}

/** 해시태그 칩 — 보더 없이 회색 면으로만 구분한다. */
export function TagChips({ tags, onPressTag, onRemoveTag }: TagChipsProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()

  if (tags.length === 0) return null

  return (
    <View style={styles.row}>
      {tags.map((tag) => {
        const chip = (
          <View style={[styles.chip, { backgroundColor: surface.surface }]}>
            <Text style={[styles.chipText, { color: surface.text }]}>
              #{tag}
            </Text>
            {onRemoveTag && (
              <Pressable
                onPress={() => onRemoveTag(tag)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("tag.delete", { tag })}
              >
                <Ionicons name="close" size={13} color={surface.textWeak} />
              </Pressable>
            )}
          </View>
        )

        if (!onPressTag) {
          return <View key={tag}>{chip}</View>
        }

        return (
          <Pressable
            key={tag}
            onPress={() => onPressTag(tag)}
            accessibilityRole="button"
            accessibilityLabel={t("tag.search", { tag })}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            {chip}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    height: 28,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chipText: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },
})
