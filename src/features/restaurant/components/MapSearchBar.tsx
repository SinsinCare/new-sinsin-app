import { Text } from "@/src/design-system-v2/primitives/NativeText"
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"

import {
  V2Icon,
  radius,
  spacing,
  touchTarget,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"

import { FLOATING_SHADOW, mapOverlayChrome } from "./mapFloating"

export const MAP_SEARCH_BAR_HEIGHT = 48
const HEIGHT = MAP_SEARCH_BAR_HEIGHT

export interface MapSearchBarProps {
  /** 확정된 검색어. 비어 있으면 자리표시자를 그린다. */
  embedded?: boolean
  bookmarkedOnly?: boolean
  onToggleBookmarkedOnly?: () => void
  query?: string
  /** 탭 → 검색 화면. */
  onPress: () => void
  /** 검색어 지우기. `query` 가 있을 때만 버튼이 생긴다. */
  onClear?: () => void
  style?: ViewStyle
}

export function MapSearchBar({
  embedded = false,
  query = "",
  bookmarkedOnly = false,
  onToggleBookmarkedOnly,
  onPress,
  onClear,
  style,
}: MapSearchBarProps) {
  const { t } = useTranslation("common")
  const { colors, mode } = useV2Theme()
  const hasQuery = query.trim().length > 0
  const chrome = mapOverlayChrome({ mode, ...colors })

  return (
    <View
      style={[
        styles.root,
        embedded
          ? { backgroundColor: colors.fill.control }
          : [FLOATING_SHADOW, chrome],
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("restaurant.searchAccessibility")}
        accessibilityHint={t("restaurant.map.searchPlaceholder")}
        onPress={onPress}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <V2Icon name="search" size="sm" color={colors.label.alternative} />
        <Text
          style={[
            typography.label.smallWeak,
            styles.text,
            {
              color: hasQuery ? colors.label.normal : colors.label.neutral,
            },
          ]}
          numberOfLines={1}
        >
          {hasQuery ? query : t("restaurant.map.searchPlaceholder")}
        </Text>
      </Pressable>
      {onToggleBookmarkedOnly && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(
            bookmarkedOnly
              ? "restaurant.map.bookmarkedOnlyOff"
              : "restaurant.map.bookmarkedOnly",
          )}
          accessibilityState={{ selected: bookmarkedOnly }}
          onPress={onToggleBookmarkedOnly}
          style={[styles.bookmark, { borderLeftColor: colors.line.neutral }]}
        >
          <V2Icon
            name={bookmarkedOnly ? "bookmarkFilled" : "bookmark"}
            size="sm"
            color={
              bookmarkedOnly ? colors.primary.primary : colors.label.normal
            }
          />
        </Pressable>
      )}
      {hasQuery && onClear && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("accessibility.clear")}
          onPress={onClear}
          style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
        >
          <V2Icon name="close" size="sm" color={colors.label.neutral} />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: HEIGHT,
    borderRadius: radius.full,
    paddingHorizontal: spacing[16],
  },
  // 필드 전체가 터치 타겟이다. 지우기 버튼만 그 위에서 따로 잡는다.
  field: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
    minHeight: HEIGHT,
    paddingVertical: spacing[8],
  },
  text: { flexShrink: 1 },
  bookmark: {
    minHeight: touchTarget.min,
    minWidth: touchTarget.min,
    marginRight: -spacing[8],
    borderLeftWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    alignItems: "center",
  },
  clear: {
    minWidth: touchTarget.min,
    minHeight: touchTarget.min,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.6 },
})
