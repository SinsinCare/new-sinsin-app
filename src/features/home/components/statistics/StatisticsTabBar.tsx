import { ScrollView, Pressable, StyleSheet } from "react-native"
import { Text } from "tamagui"
import { StatisticsTab } from "../../types"

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
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {TABS.map((tab) => {
        const isSelected = selectedTab === tab.key
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelectTab(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              isSelected && styles.tabSelected,
              pressed && !isSelected && styles.tabPressed,
            ]}
          >
            <Text
              fontSize="$4"
              fontWeight="600"
              color={isSelected ? "$color" : "$colorSubtle"}
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
    gap: 7,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  tabSelected: {
    backgroundColor: "#ffffff",
  },
  tabPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
})
