import { ScrollView, Pressable, StyleSheet } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text } from "tamagui"
import { StatisticsTab } from "../../types"
import { tokens } from "@/src/theme/tokens"

const TABS: { key: StatisticsTab; label: string }[] = [
  { key: "intake", label: "섭취량 통계" },
  { key: "guide", label: "식이 가이드" },
  { key: "record", label: "식이 기록" },
  { key: "weight", label: "체중·부종 기록" },
]

interface StatisticsTabBarProps {
  selectedTab: StatisticsTab
  onSelectTab: (tab: StatisticsTab) => void
}

export function StatisticsTabBar({
  selectedTab,
  onSelectTab,
}: StatisticsTabBarProps) {
  const isDarkMode = useAppColorScheme() === "dark"
  const barBgColor = isDarkMode
    ? tokens.color.appBgDark.val
    : tokens.color.appBg.val
  const bgColor = isDarkMode ? tokens.color.cardBgDark.val : undefined

  return (
    <ScrollView
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
              {tab.label}
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
