import { useCallback } from "react"
import { Pressable, useColorScheme, View } from "react-native"
import { Text } from "tamagui"
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
        paddingHorizontal: 28,
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
