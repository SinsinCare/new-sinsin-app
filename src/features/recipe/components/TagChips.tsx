import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
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
          <View
            style={[styles.chip, { backgroundColor: surface.surfaceSunken }]}
          >
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
  /*
    고정 높이 28 + 행간 18 이라 글자 크기를 1.55배쯤 올리면 `#저염` 의 위아래가
    잘렸다. 상한(`maxFontSizeMultiplier`)을 거는 대신 상자를 자라게 둔다 — 이 칩은
    줄바꿈되는 행 안이라 자랄 자리가 있다(같은 판단이 `CommunityPopularScreen` 의
    칩·배지 주석에 적혀 있다). 1배에서는 18 + 5*2 = 28 로 픽셀이 그대로다.
  */
  chip: {
    minHeight: 28,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
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
