import { Text } from "@/src/design-system-v2/primitives/NativeText"
/** One continuous filter form. Changes stay in the draft until results are applied. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import {
  spacing,
  touchTarget,
  typography,
  useV2Theme,
  V2BottomSheet,
  V2Button,
  V2Icon,
} from "@/src/design-system-v2"
import { dynamicKey } from "@/src/i18n/dynamicKey"
import { SHEET_GUTTER } from "../layout"
import {
  CUISINE_TYPES,
  NUTRITION_TAGS,
  SORT_OPTIONS,
  hasUnbackedSelection,
} from "../data/filterCatalog"
import {
  groupsFor,
  isSidoAllKey,
  sidoKeyOf,
  sidoList,
} from "../data/regionCatalog"
import type { UseRestaurantFiltersResult } from "../hooks/useRestaurantFilters"
import type { DistanceSortDisabledReason, FilterState } from "../types"
import type { FilterAxis } from "./FilterChipRow"
import { ChipWrap, SelectableChip } from "./SelectableChip"

export type FilterSection = FilterAxis | "sort" | "hours" | "all"
export interface FilterSheetProps {
  visible: boolean
  onClose: () => void
  filters: UseRestaurantFiltersResult
  onApply?: () => void
  initialSection?: FilterSection
  distanceDisabledReason?: DistanceSortDisabledReason | null
}
const FILTER_SNAP_POINTS = ["82%"]

function isRegionSelected(draft: FilterState, groupKey: string): boolean {
  return isSidoAllKey(groupKey)
    ? draft.regionSidos.includes(sidoKeyOf(groupKey))
    : draft.regionGroups.includes(groupKey)
}

export function FilterSheet({
  visible,
  onClose,
  filters,
  onApply,
  initialSection = "all",
  distanceDisabledReason = null,
}: FilterSheetProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const { draft } = filters
  const [footerHeight, setFooterHeight] = useState(48 + spacing[12] * 2 + 1)
  const scrollRef = useRef<ScrollView>(null)
  const offsets = useRef<Partial<Record<FilterSection, number>>>({ all: 0 })
  const pendingSection = useRef<FilterSection | null>(initialSection)
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const jumpToSection = useCallback(() => {
    const section = pendingSection.current
    if (section === null) return
    const y = offsets.current[section]
    if (y === undefined || !scrollRef.current) return
    scrollRef.current.scrollTo({
      y: Math.max(0, y - spacing[20]),
      animated: false,
    })
    // The docked footer can resize the viewport once after mounting. Keep the
    // initial destination until the user scrolls so the final region rows stay reachable.
  }, [])

  useEffect(() => {
    if (!visible) return
    filtersRef.current.syncDraft()
    if (filtersRef.current.filters.activeSido === null) {
      filtersRef.current.setActiveSido(sidoList()[0].key)
    }
    pendingSection.current = initialSection
    // On remount the content-size callback runs this; on a retained sheet use measured offsets.
    const frame = requestAnimationFrame(jumpToSection)
    return () => cancelAnimationFrame(frame)
  }, [visible, initialSection, jumpToSection])

  const groups = groupsFor(draft.activeSido)
  const showUnbackedNotice = useMemo(
    () =>
      hasUnbackedSelection({
        nutritionTags: draft.nutritionTags,
        cuisineTypes: draft.cuisineTypes,
      }),
    [draft.nutritionTags, draft.cuisineTypes],
  )
  const headingStyle = [typography.label.small, { color: colors.label.normal }]
  const handleApply = () => {
    filters.applyDraft()
    onApply?.()
    onClose()
  }
  const rememberOffset = (section: FilterSection, y: number) => {
    offsets.current[section] = y
  }

  const footer = (
    <View
      onLayout={(event) =>
        setFooterHeight(Math.ceil(event.nativeEvent.layout.height))
      }
      style={[
        styles.footer,
        {
          borderTopColor: colors.line.alternative,
          paddingBottom: spacing[12],
          backgroundColor: colors.background.default,
        },
      ]}
    >
      <V2Button
        size="m"
        color="neutral"
        variant="weak"
        onPress={filters.resetDraft}
        style={{
          ...styles.reset,
          backgroundColor: colors.background.default,
          borderColor: colors.line.neutral,
        }}
      >
        {t("restaurant.filter.reset")}
      </V2Button>
      <V2Button
        size="m"
        color="brand"
        variant="fill"
        onPress={handleApply}
        style={styles.apply}
      >
        {t("restaurant.filter.applyResults")}
      </V2Button>
    </View>
  )

  return (
    <V2BottomSheet
      surface="restaurant_filter"
      visible={visible}
      onClose={onClose}
      footer={footer}
      snapPoints={FILTER_SNAP_POINTS}
    >
      <View
        style={[styles.header, { borderBottomColor: colors.line.alternative }]}
      >
        <Text
          accessibilityRole="header"
          style={[typography.title.xSmallWeak, { color: colors.label.normal }]}
        >
          {t("restaurant.filter.title")}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("action.close")}
          onPress={onClose}
          style={styles.close}
        >
          <V2Icon name="close" size="sm" color={colors.label.neutral} />
        </Pressable>
      </View>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        bounces={false}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={jumpToSection}
        onLayout={jumpToSection}
        onScrollBeginDrag={() => {
          pendingSection.current = null
        }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: spacing[24] + footerHeight },
        ]}
      >
        <View
          style={styles.section}
          onLayout={(e) => rememberOffset("sort", e.nativeEvent.layout.y)}
        >
          <Text accessibilityRole="header" style={headingStyle}>
            {t("restaurant.sort.title")}
          </Text>
          <ChipWrap style={styles.optionGrid}>
            {SORT_OPTIONS.map((option) => (
              <SelectableChip
                key={option.value}
                style={styles.third}
                size="s"
                variant="filter"
                label={t(dynamicKey(option.labelKey))}
                selected={draft.sort === option.value}
                disabled={
                  option.requiresLocation && distanceDisabledReason !== null
                }
                onPress={() => filters.setDraftSort(option.value)}
              />
            ))}
          </ChipWrap>
          {distanceDisabledReason !== null && (
            <Text
              style={[
                typography.subtext.small,
                { color: colors.label.neutral },
              ]}
            >
              {t(
                distanceDisabledReason === "OUTSIDE_COVERAGE"
                  ? "restaurant.sort.distanceDisabledOutsideCoverage"
                  : "restaurant.sort.distanceDisabled",
              )}
            </Text>
          )}
        </View>
        <View
          style={styles.section}
          onLayout={(e) => rememberOffset("hours", e.nativeEvent.layout.y)}
        >
          <Text accessibilityRole="header" style={headingStyle}>
            {t("restaurant.filter.businessHours")}
          </Text>
          <ChipWrap>
            <SelectableChip
              size="s"
              variant="filter"
              label={t("restaurant.businessStatus.OPEN")}
              selected={draft.openNow}
              onPress={() => filters.setDraftOpenNow(!draft.openNow)}
            />
          </ChipWrap>
        </View>
        <View
          style={styles.section}
          onLayout={(e) => rememberOffset("nutrition", e.nativeEvent.layout.y)}
        >
          <Text accessibilityRole="header" style={headingStyle}>
            {t("restaurant.filter.nutrient")}
          </Text>
          <ChipWrap style={styles.optionGrid}>
            {NUTRITION_TAGS.map((tag) => (
              <SelectableChip
                key={tag.value}
                style={styles.fifth}
                size="s"
                variant="filter"
                label={t(dynamicKey(tag.labelKey))}
                selected={draft.nutritionTags.includes(tag.value)}
                onPress={() => filters.toggleNutritionTag(tag.value)}
              />
            ))}
          </ChipWrap>
        </View>
        <View
          style={styles.section}
          onLayout={(e) => rememberOffset("cuisine", e.nativeEvent.layout.y)}
        >
          <Text accessibilityRole="header" style={headingStyle}>
            {t("restaurant.filter.foodType")}
          </Text>
          <ChipWrap style={styles.optionGrid}>
            {CUISINE_TYPES.map((cuisine) => (
              <SelectableChip
                key={cuisine.value}
                style={styles.quarter}
                size="s"
                variant="filter"
                label={t(dynamicKey(cuisine.labelKey))}
                selected={draft.cuisineTypes.includes(cuisine.value)}
                onPress={() => filters.toggleCuisineType(cuisine.value)}
              />
            ))}
          </ChipWrap>
        </View>
        <View
          style={styles.section}
          onLayout={(e) => rememberOffset("region", e.nativeEvent.layout.y)}
        >
          <Text accessibilityRole="header" style={headingStyle}>
            {t("restaurant.filter.region")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.provinces}
            contentContainerStyle={styles.provinceContent}
          >
            {sidoList().map((sido) => (
              <SelectableChip
                key={sido.key}
                size="s"
                variant="filter"
                label={t(dynamicKey(sido.labelKey))}
                selected={draft.activeSido === sido.key}
                onPress={() => filters.setActiveSido(sido.key)}
              />
            ))}
          </ScrollView>
          <ChipWrap>
            {groups.map((group) => (
              <SelectableChip
                key={group.key}
                size="s"
                variant="quiet"
                label={t(dynamicKey(group.labelKey))}
                selected={isRegionSelected(draft, group.key)}
                onPress={() => filters.toggleRegion(group.key)}
              />
            ))}
          </ChipWrap>
        </View>
        {showUnbackedNotice && (
          <Text
            style={[typography.subtext.medium, { color: colors.label.neutral }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("restaurant.filter.unbackedNotice")}
          </Text>
        )}
      </ScrollView>
    </V2BottomSheet>
  )
}
const styles = StyleSheet.create({
  header: {
    paddingLeft: SHEET_GUTTER,
    paddingRight: spacing[8],
    paddingBottom: spacing[8],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  close: {
    minWidth: touchTarget.min,
    minHeight: touchTarget.min,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: SHEET_GUTTER,
    paddingTop: spacing[20],
    paddingBottom: spacing[24],
    gap: spacing[24],
  },
  section: { gap: spacing[8] },
  optionGrid: { columnGap: spacing[6], rowGap: 0 },
  third: { width: "32%", paddingHorizontal: spacing[4] },
  quarter: { width: "23.5%", paddingHorizontal: spacing[4] },
  fifth: { width: "18.5%", paddingHorizontal: spacing[4] },
  provinces: { flexGrow: 0, marginHorizontal: -SHEET_GUTTER },
  provinceContent: { paddingHorizontal: SHEET_GUTTER, gap: spacing[6] },
  footer: {
    flexDirection: "row",
    gap: spacing[8],
    paddingHorizontal: SHEET_GUTTER,
    paddingTop: spacing[12],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  reset: { flex: 1, minHeight: 48, borderWidth: 1 },
  apply: { flex: 2, minHeight: 48 },
})
