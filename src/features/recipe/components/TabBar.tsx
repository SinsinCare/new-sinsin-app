import { useCallback } from "react"
import { Pressable, View } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { V2Text } from "@/src/design-system-v2"
import { tokens } from "@/src/theme/tokens"

const COLORS = {
  light: {
    active: tokens.color.textLight.val,
    inactive: tokens.color.textLightSub.val,
  },
  dark: {
    active: tokens.color.textDark.val,
    inactive: tokens.color.textLightMuted.val,
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
  const isDark = useAppColorScheme() === "dark"
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
          <V2Text color={activeTab === tab.key ? palette.active : palette.inactive} style={{ fontSize: 18, lineHeight: 24, fontWeight: "600", paddingVertical: 10 }}>
            {tab.label}
          </V2Text>
        </Pressable>
      ))}
    </View>
  )
}
