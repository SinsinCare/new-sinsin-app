import { Pressable, StyleSheet, View } from "react-native"
import { TextInput } from "@/src/shared/components/AppText"
import { singleLineInputText } from "@/src/theme/surface"
import {
  V2Icon,
  V2Text,
  borderWidth,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { useTranslation } from "react-i18next"
interface RecipeSearchFieldProps {
  value: string
  onChangeText: (value: string) => void
  onSubmit: () => void
  onClear: () => void
  onFocus: () => void
  onBlur: () => void
  onOpenFilters: () => void
  appliedFilterCount: number
  placeholder?: string
}
export function RecipeSearchField({
  value,
  onChangeText,
  onSubmit,
  onClear,
  onFocus,
  onBlur,
  onOpenFilters,
  appliedFilterCount,
  placeholder,
}: RecipeSearchFieldProps) {
  const { t } = useTranslation("recipe")
  const { colors } = useV2Theme()
  const hasFilters = appliedFilterCount > 0
  return (
    <View style={styles.row}>
      <View style={[styles.field, { backgroundColor: colors.fill.control }]}>
        <V2Icon name="search" size="sm" color={colors.label.neutral} />
        <TextInput
          style={[styles.input, { color: colors.label.normal }]}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          accessibilityLabel={placeholder ?? t("feed.recipeSearchPlaceholder")}
          placeholder={placeholder ?? t("feed.recipeSearchPlaceholder")}
          placeholderTextColor={colors.label.neutral}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {value.length > 0 && (
          <Pressable
            onPress={onClear}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("feed.clearSearch")}
          >
            <V2Icon name="close" size="xs" color={colors.label.neutral} />
          </Pressable>
        )}
      </View>
      <Pressable
        onPress={onOpenFilters}
        accessibilityRole="button"
        accessibilityLabel={
          hasFilters
            ? t("list.filterApplied", { count: appliedFilterCount })
            : t("list.filterOpen")
        }
        accessibilityState={{ selected: hasFilters }}
        style={({ pressed }) => [
          styles.filter,
          {
            opacity: pressed ? 0.65 : 1,
            borderColor: colors.line.normal,
            backgroundColor: hasFilters
              ? colors.label.normal
              : colors.background.default,
          },
        ]}
      >
        <V2Icon
          name="filter"
          size="sm"
          color={hasFilters ? colors.background.default : colors.label.normal}
        />
        {hasFilters && (
          <View
            style={[
              styles.count,
              {
                backgroundColor: colors.label.normal,
                borderColor: colors.background.default,
              },
            ]}
          >
            <V2Text token="caption.small" color={colors.background.default}>
              {appliedFilterCount}
            </V2Text>
          </View>
        )}
      </Pressable>
    </View>
  )
}
const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing[8] },
  field: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingHorizontal: spacing[12],
    minHeight: 44,
    borderRadius: radius.md,
  },
  /* 단일행 입력: lineHeight 를 빼야 iOS 가 글리프·플레이스홀더를 세로 중앙에 둔다(surface.ts singleLineInputText). 높이는 바깥 `field` 가 잡는다. */
  input: {
    ...singleLineInputText(typography.subtext.large),
    flex: 1,
    padding: 0,
  },
  filter: {
    width: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: borderWidth.thin,
  },
  count: {
    position: "absolute",
    top: -spacing[4],
    right: -spacing[4],
    minWidth: 20,
    height: 20,
    paddingHorizontal: spacing[4],
    borderRadius: radius.full,
    borderWidth: borderWidth.thick,
    alignItems: "center",
    justifyContent: "center",
  },
})
