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

export interface TabItem<T extends string = string> {
  key: T
  label: string
}

interface TopTabBarProps<T extends string = string> {
  tabs: TabItem<T>[]
  activeTab: T
  onTabChange: (tab: T) => void
}

export function TopTabBar<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
}: TopTabBarProps<T>) {
  const isDark = useColorScheme() === "dark"
  const palette = isDark ? COLORS.dark : COLORS.light

  const handlePress = useCallback(
    (key: T) => {
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
        paddingHorizontal: 28,
        paddingVertical: 5,
      }}
    >
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => handlePress(tab.key)}
          hitSlop={8}
        >
          <Text
            fontSize={18}
            lineHeight={24}
            fontWeight={"600"}
            fontFamily="$body"
            color={activeTab === tab.key ? palette.active : palette.inactive}
            paddingVertical={10}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}
