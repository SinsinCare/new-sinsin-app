import { Text } from "@/src/design-system-v2/primitives/NativeText"
import { StyleSheet, View } from "react-native"
import { Pressable } from "react-native-gesture-handler"
import { useTranslation } from "react-i18next"
import {
  spacing,
  touchTarget,
  typography,
  useV2Theme,
  V2Icon,
} from "@/src/design-system-v2"
import { dynamicKey } from "@/src/i18n/dynamicKey"
import { sortLabelKey } from "../data/filterCatalog"
import type { SortOption } from "../types"
import { GUTTER } from "../layout"

export function MapResultsHeader({
  total,
  loading,
  expanded,
  regionCount = 0,
  sort,
  onPressRegion,
  onPressSort,
  onShowMap,
  onShowList,
}: {
  total: number | null
  loading: boolean
  expanded: boolean
  regionCount?: number
  sort: SortOption
  onPressRegion: () => void
  onPressSort: () => void
  onShowMap: () => void
  onShowList: () => void
}) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="button"
        onPress={onPressRegion}
        style={({ pressed }) => [styles.control, pressed && styles.pressed]}
      >
        <Text
          style={[typography.label.xSmallWeak, { color: colors.label.neutral }]}
        >
          {regionCount > 0
            ? t("restaurant.map.selectedRegions", { count: regionCount })
            : t("restaurant.map.currentMap")}
        </Text>
        <V2Icon name="chevronDown" size="xs" color={colors.label.neutral} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onPressSort}
        style={({ pressed }) => [styles.control, pressed && styles.pressed]}
      >
        <Text
          style={[typography.label.xSmallWeak, { color: colors.label.neutral }]}
        >
          {t(dynamicKey(sortLabelKey(sort)))}
        </Text>
        <V2Icon name="chevronDown" size="xs" color={colors.label.neutral} />
      </Pressable>
      <Text
        numberOfLines={1}
        accessibilityLiveRegion="polite"
        accessibilityLabel={
          loading ? t("restaurant.map.findingResults") : undefined
        }
        style={[
          typography.subtext.small,
          styles.count,
          { color: colors.label.neutral },
        ]}
      >
        {total === null
          ? ""
          : t("restaurant.map.resultCount", { count: total })}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(
          expanded ? "restaurant.map.showMap" : "restaurant.map.showList",
        )}
        onPress={expanded ? onShowMap : onShowList}
        style={({ pressed }) => [styles.control, pressed && styles.pressed]}
      >
        <V2Icon
          name={expanded ? "mapPin" : "chevronDown"}
          style={expanded ? undefined : styles.expandIcon}
          size="xs"
          color={colors.label.normal}
        />
        <Text style={[typography.label.xSmall, { color: colors.label.normal }]}>
          {t(expanded ? "restaurant.map.mapView" : "restaurant.map.listView")}
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
  control: {
    minHeight: touchTarget.min,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
  },
  count: { flex: 1, textAlign: "right", fontVariant: ["tabular-nums"] },
  pressed: { opacity: 0.7 },
  expandIcon: { transform: [{ rotate: "180deg" }] },
})
