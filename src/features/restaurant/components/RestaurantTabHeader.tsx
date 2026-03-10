import { useCallback } from "react"
import { Pressable, useColorScheme, View } from "react-native"
import { Text } from "tamagui"

const COLORS = {
  light: {
    active: "#2A2A37",
    inactive: "#A5A5AF",
  },
  dark: {
    active: "#E7E7EE",
    inactive: "#595960",
  },
} as const

export interface RestaurantTab {
  key: string
  label: string
}

interface RestaurantTabHeaderProps {
  tabs: RestaurantTab[]
  activeTab: string
  onTabChange: (tab: string) => void
}

export function RestaurantTabHeader({
  tabs,
  activeTab,
  onTabChange,
}: RestaurantTabHeaderProps) {
  const isDark = useColorScheme() === "dark"
  const palette = isDark ? COLORS.dark : COLORS.light

  const handlePress = useCallback(
    (key: string) => {
      onTabChange(key)
    },
    [onTabChange],
  )

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => handlePress(tab.key)}
          hitSlop={8}
        >
          <Text
            fontSize={22}
            fontWeight={activeTab === tab.key ? "700" : "500"}
            fontFamily="$body"
            color={activeTab === tab.key ? palette.active : palette.inactive}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}
