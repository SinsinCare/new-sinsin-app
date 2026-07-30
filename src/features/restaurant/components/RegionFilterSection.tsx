import { Pressable, StyleSheet, View } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text, XStack, YStack } from "tamagui"
import { useTranslation } from "react-i18next"
import { tokens } from "@/src/theme/tokens"
import { REGIONS, SUB_REGIONS } from "../data/filterData"

interface RegionFilterSectionProps {
  selectedRegion: string | null
  selectedSubRegions: string[]
  onRegionChange: (region: string | null) => void
  onSubRegionToggle: (subRegion: string) => void
  onReset: () => void
}

export function RegionFilterSection({
  selectedRegion,
  selectedSubRegions,
  onRegionChange,
  onSubRegionToggle,
  onReset,
}: RegionFilterSectionProps) {
  const { t } = useTranslation("common")
  const isDarkMode = useAppColorScheme() === "dark"

  const textColor = isDarkMode ? tokens.color.textDarkSub.val : "#474758"
  const resetColor = isDarkMode ? tokens.color.textDarkSub.val : "#474758"
  const defaultBorder = isDarkMode
    ? tokens.color.cardBgDark.val
    : tokens.color.borderLight.val
  const selectedBorder = tokens.color.primaryAccent.val
  const selectedBg = isDarkMode ? "#D56E321A" : "#FCEBE1"
  const headingColor = isDarkMode
    ? tokens.color.textDark.val
    : tokens.color.textLight.val

  const subRegions = selectedRegion
    ? (SUB_REGIONS[selectedRegion as keyof typeof SUB_REGIONS] ?? [])
    : []

  return (
    <YStack paddingHorizontal={16} paddingVertical={16} gap={12}>
      {/* Section Header */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text
          fontFamily="$body"
          fontWeight="600"
          fontSize={15}
          color={headingColor}
        >
          {t("restaurant.filter.region")}
        </Text>
        <Pressable onPress={onReset}>
          <XStack alignItems="center" gap={4}>
            <Text fontFamily="$body" fontSize={13} color={resetColor}>
              {t("restaurant.filter.reset")}
            </Text>
          </XStack>
        </Pressable>
      </XStack>

      {/* Province Grid */}
      <View style={styles.regionGrid}>
        {REGIONS.map((region) => {
          const isAll = region.key === "all"
          const isSelected = isAll
            ? selectedRegion === null
            : selectedRegion === region.key
          return (
            <Pressable
              key={region.key}
              onPress={() => onRegionChange(isAll ? null : region.key)}
              style={[
                styles.regionButton,
                {
                  borderColor: isSelected ? selectedBorder : defaultBorder,
                },
              ]}
            >
              <Text
                fontFamily="$body"
                fontWeight="500"
                fontSize={14}
                color={isSelected ? selectedBorder : textColor}
              >
                {t(region.labelKey)}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Sub-regions */}
      {subRegions.length > 0 && (
        <View style={styles.subRegionWrap}>
          {subRegions.map((sub) => {
            const isSelected = selectedSubRegions.includes(sub.key)
            return (
              <Pressable
                key={sub.key}
                onPress={() => onSubRegionToggle(sub.key)}
                style={[
                  styles.subRegionChip,
                  {
                    borderColor: isSelected ? selectedBorder : defaultBorder,
                    backgroundColor: isSelected ? selectedBg : "transparent",
                  },
                ]}
              >
                <Text fontFamily="$body" fontSize={13} color={textColor}>
                  {t(sub.labelKey)}
                </Text>
                {isSelected && (
                  <Text
                    fontFamily="$body"
                    fontSize={11}
                    color={textColor}
                    marginLeft={4}
                  >
                    ✕
                  </Text>
                )}
              </Pressable>
            )
          })}
        </View>
      )}
    </YStack>
  )
}

const styles = StyleSheet.create({
  regionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  regionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  subRegionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  subRegionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
})
