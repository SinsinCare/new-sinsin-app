import { Pressable, useColorScheme } from "react-native"
import { Text, XStack } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { FilterTab } from "../types"

const TABS: { key: FilterTab; label: string }[] = [
  { key: "region", label: "지역" },
  { key: "foodType", label: "음식 종류" },
  { key: "nutrient", label: "영양소 제한" },
]

interface FilterTabBarProps {
  activeTab: FilterTab
  onTabChange: (tab: FilterTab) => void
  onClose: () => void
}

export function FilterTabBar({ activeTab, onTabChange, onClose }: FilterTabBarProps) {
  const isDarkMode = useColorScheme() === "dark"
  const insets = useSafeAreaInsets()

  const activeTextColor = isDarkMode ? "#E7E7EE" : "#2A2A37"
  const inactiveTextColor = isDarkMode ? "#595960" : "#2A2A37"
  const borderColor = isDarkMode ? "#313138" : "#EAEAF0"

  return (
    <XStack
      alignItems="center"
      paddingHorizontal={16}
      paddingTop={insets.top + 8}
      paddingBottom={12}
      borderBottomWidth={1}
      borderBottomColor={borderColor}
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
                borderBottomWidth={isActive ? 2 : 0}
                borderBottomColor={activeTextColor}
              >
                {tab.label}
              </Text>
            </Pressable>
          )
        })}
      </XStack>
      <Pressable onPress={onClose} hitSlop={8}>
        <Text fontSize={18} color={activeTextColor}>
          ✕
        </Text>
      </Pressable>
    </XStack>
  )
}
