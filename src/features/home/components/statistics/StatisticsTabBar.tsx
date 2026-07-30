import { ScrollView, Pressable, StyleSheet } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text } from "tamagui"
import { StatisticsTab } from "../../types"
import { tokens } from "@/src/theme/tokens"
import { useTranslation } from "react-i18next"

const TABS = [
  { key: "intake", labelKey: "stats.tabs.nutrients" },
  { key: "guide", labelKey: "stats.tabs.mealGuide" },
  { key: "record", labelKey: "stats.tabs.mealLog" },
  { key: "weight", labelKey: "stats.tabs.body" },
] as const satisfies readonly {
  key: StatisticsTab
  labelKey:
    | "stats.tabs.nutrients"
    | "stats.tabs.mealGuide"
    | "stats.tabs.mealLog"
    | "stats.tabs.body"
}[]

interface StatisticsTabBarProps {
  selectedTab: StatisticsTab
  onSelectTab: (tab: StatisticsTab) => void
}

export function StatisticsTabBar({
  selectedTab,
  onSelectTab,
}: StatisticsTabBarProps) {
  const { t } = useTranslation()
  const isDarkMode = useAppColorScheme() === "dark"
  const barBgColor = isDarkMode
    ? tokens.color.appBgDark.val
    : tokens.color.appBg.val
  const bgColor = isDarkMode ? tokens.color.cardBgDark.val : undefined

  return (
    <ScrollView
      bounces={false}
      overScrollMode="never"
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={{ backgroundColor: barBgColor }}
    >
      {TABS.map((tab) => {
        const isSelected = selectedTab === tab.key
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelectTab(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={t(tab.labelKey)}
            style={() => [
              styles.tab,
              isSelected && { backgroundColor: bgColor },
            ]}
          >
            <Text
              fontSize="$4"
              fontWeight="600"
              color={
                isSelected
                  ? isDarkMode
                    ? tokens.color.textDark.val
                    : tokens.color.black.val
                  : isDarkMode
                    ? tokens.color.textDarkSub.val
                    : tokens.color.grey5.val
              }
            >
              {t(tab.labelKey)}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 5,
    gap: 7,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
})
