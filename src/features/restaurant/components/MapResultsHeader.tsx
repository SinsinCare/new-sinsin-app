import { Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import {
  radius,
  spacing,
  touchTarget,
  typography,
  useV2Theme,
  V2Icon,
} from "@/src/design-system-v2"
import { GUTTER } from "../layout"

export function MapResultsHeader({
  total,
  bookmarkedOnly = false,
  loading,
  expanded,
  onShowMap,
  onShowList,
}: {
  bookmarkedOnly?: boolean
  total: number | null
  loading: boolean
  expanded: boolean
  onShowMap: () => void
  onShowList: () => void
}) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  return (
    <View style={styles.root}>
      <View style={styles.summary}>
        <Text
          style={[typography.title.xSmallWeak, { color: colors.label.normal }]}
        >
          {t(
            bookmarkedOnly
              ? "restaurant.map.savedResultsTitle"
              : "restaurant.map.resultsTitle",
          )}
        </Text>
        <Text
          style={[typography.subtext.medium, { color: colors.label.neutral }]}
          accessibilityLiveRegion="polite"
        >
          {loading
            ? t("restaurant.map.findingResults")
            : total === null
              ? t("restaurant.map.resultsHint")
              : t("restaurant.map.resultCount", { count: total })}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(
          expanded ? "restaurant.map.showMap" : "restaurant.map.showList",
        )}
        onPress={expanded ? onShowMap : onShowList}
        style={({ pressed }) => [styles.option, pressed && styles.pressed]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.optionSurface,
            { backgroundColor: colors.fill.normal },
          ]}
        />
        <V2Icon
          name={expanded ? "mapPin" : "chevronDown"}
          style={expanded ? undefined : styles.expandIcon}
          size="xs"
          color={colors.label.normal}
        />
        <Text
          style={[
            typography.label.xSmall,
            {
              color: colors.label.normal,
            },
          ]}
        >
          {t(
            expanded ? "restaurant.map.mapAction" : "restaurant.map.listAction",
          )}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    paddingHorizontal: GUTTER,
  },
  summary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    columnGap: spacing[8],
    rowGap: spacing[2],
  },
  option: {
    minHeight: touchTarget.min,
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[8],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
    borderRadius: radius.lg,
  },
  optionSurface: {
    ...StyleSheet.absoluteFillObject,
    top: spacing[6],
    bottom: spacing[6],
    borderRadius: radius.full,
  },
  pressed: { opacity: 0.7 },
  expandIcon: { transform: [{ rotate: "180deg" }] },
})
