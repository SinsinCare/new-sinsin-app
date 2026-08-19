import { StyleSheet, View } from "react-native"

import { Text } from "@/src/shared/components/AppText"
import { useV2Theme, V2Chip } from "@/src/design-system-v2"
import { spacing, typography } from "@/src/design-system-v2/tokens"

interface TagSelectorProps {
  tags: readonly string[]
  selected: string[]
  onToggle: (tag: string) => void
  label: string
  getLabel?: (tag: string) => string
}

/**
 * 태그 고르기 줄.
 *
 * 예전에는 `chipTheme`("primary" | "sub" | "tertiary")으로 줄마다 칩 색을 달리 줬는데,
 * 색이 뜻하는 게 없어서(전부 그냥 태그다) 화면만 알록달록해졌다. 지금은 한 얼굴이고,
 * **고른 것만 브랜드 면**으로 구분한다 — 색은 상태를 말할 때만 쓴다.
 */
export function TagSelector({
  tags,
  selected,
  onToggle,
  label,
  getLabel = (tag) => tag,
}: TagSelectorProps) {
  const { colors } = useV2Theme()

  return (
    <View style={styles.root}>
      <Text style={[typography.subtext.large, { color: colors.label.normal }]}>
        {label}
      </Text>
      <View style={styles.chips}>
        {tags.map((tag) => (
          <V2Chip
            key={tag}
            label={getLabel(tag)}
            size="s"
            selected={selected.includes(tag)}
            onPress={() => onToggle(tag)}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: spacing[10], marginBottom: spacing[16] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing[8] },
})
