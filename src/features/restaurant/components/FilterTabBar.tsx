import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text, XStack } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { tokens } from "@/src/theme/tokens"
import type { FilterTab } from "../types"

const TABS = [
  { key: "region", labelKey: "restaurant.tabs.region" },
  { key: "foodType", labelKey: "restaurant.tabs.foodType" },
  { key: "nutrient", labelKey: "restaurant.tabs.nutrient" },
] as const satisfies readonly { key: FilterTab; labelKey: string }[]

interface FilterTabBarProps {
  activeTab: FilterTab
  onTabChange: (tab: FilterTab) => void
  onClose: () => void
}

export function FilterTabBar({
  activeTab,
  onTabChange,
  onClose,
}: FilterTabBarProps) {
  const { t } = useTranslation("common")
  const isDarkMode = useAppColorScheme() === "dark"
  const insets = useSafeAreaInsets()

  const activeTextColor = isDarkMode
    ? tokens.color.textDark.val
    : tokens.color.textLight.val
  const inactiveTextColor = isDarkMode
    ? tokens.color.textLightMuted.val
    : tokens.color.textLight.val
  const borderColor = isDarkMode
    ? tokens.color.cardBgDark.val
    : tokens.color.borderLight.val

  return (
    <XStack
      alignItems="center"
      paddingHorizontal={16}
      paddingTop={insets.top + 8}
      paddingBottom={12}
      style={{ borderBottomWidth: 1, borderBottomColor: borderColor }}
    >
      <XStack flex={1} gap={16}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <Pressable key={tab.key} onPress={() => onTabChange(tab.key)}>
              <Text
                fontFamily="$body"
                fontWeight={isActive ? "700" : "500"}
                fontSize={16}
                color={isActive ? activeTextColor : inactiveTextColor}
                paddingBottom={8}
                style={{
                  borderBottomWidth: isActive ? 2 : 0,
                  borderBottomColor: activeTextColor,
                }}
              >
                {t(tab.labelKey)}
              </Text>
            </Pressable>
          )
        })}
      </XStack>
      <Pressable
        onPress={onClose}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t("restaurant.filter.close")}
      >
        <Text fontSize={18} color={activeTextColor}>
          ✕
        </Text>
      </Pressable>
    </XStack>
  )
}
