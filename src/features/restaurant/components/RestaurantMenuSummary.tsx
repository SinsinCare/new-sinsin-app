import { Text } from "@/src/design-system-v2/primitives/NativeText"
import { StyleSheet } from "react-native"
import { Pressable } from "react-native-gesture-handler"
import { useTranslation } from "react-i18next"
import { radius, spacing, typography, useV2Theme } from "@/src/design-system-v2"

export function RestaurantMenuSummary({
  names,
  selected = false,
  onPress,
}: {
  names?: string[]
  selected?: boolean
  onPress?: () => void
}) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const summary = names?.filter((name) => name.trim()).join(", ")
  if (!summary) return null

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t("restaurant.card.representativeMenus")}, ${summary}`}
      disabled={!onPress}
      onPress={onPress}
      hitSlop={spacing[4]}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected
            ? colors.background.default
            : colors.fill.normal,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[typography.label.xSmall, { color: colors.label.normal }]}>
        {t("restaurant.card.representativeMenus")}
      </Text>
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[
          typography.subtext.medium,
          styles.names,
          { color: colors.label.neutral },
        ]}
      >
        {summary}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[10],
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  names: { flex: 1 },
  pressed: { opacity: 0.7 },
})
