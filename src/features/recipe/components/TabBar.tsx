import { useCallback, useEffect, useState } from "react"
import {
  Pressable,
  useColorScheme,
  LayoutChangeEvent,
  View,
} from "react-native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated"
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
  rightAction?: React.ReactNode
}

export function TopTabBar<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  rightAction,
}: TopTabBarProps<T>) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const palette = isDark ? COLORS.dark : COLORS.light

  const [tabLayouts, setTabLayouts] = useState<
    Record<string, { x: number; width: number }>
  >({})
  const indicatorX = useSharedValue(0)
  const indicatorWidth = useSharedValue(0)

  useEffect(() => {
    const layout = tabLayouts[activeTab]
    if (layout) {
      indicatorX.value = withTiming(layout.x, { duration: 250 })
      indicatorWidth.value = withTiming(layout.width, { duration: 250 })
    }
  }, [activeTab, tabLayouts, indicatorX, indicatorWidth])

  const handleTabLayout = useCallback(
    (key: string, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout
      setTabLayouts((prev) => ({ ...prev, [key]: { x, width } }))
    },
    [],
  )

  const handleTabPress = useCallback(
    (key: T) => {
      onTabChange(key)
    },
    [onTabChange],
  )

  const indicatorStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    bottom: 0,
    left: indicatorX.value,
    width: indicatorWidth.value,
    height: 2,
    backgroundColor: palette.active,
    borderRadius: 1,
  }))

  return (
    <View style={{ height: 48, justifyContent: "center" }}>
      {/* Tab container - absolute center of full width */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ flexDirection: "row", gap: 24, height: "100%" }}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => handleTabPress(tab.key)}
              onLayout={(e) => handleTabLayout(tab.key, e)}
              style={{
                justifyContent: "center",
                height: "100%",
                paddingBottom: 12,
              }}
              hitSlop={8}
            >
              <Text
                fontSize={18}
                lineHeight={24}
                fontWeight={"600"}
                paddingHorizontal={24}
                color={
                  activeTab === tab.key ? palette.active : palette.inactive
                }
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}

          {/* Animated underline indicator */}
          <Animated.View style={indicatorStyle} />
        </View>
      </View>

      {/* Right action - absolute right */}
      {rightAction && (
        <View
          style={{
            position: "absolute",
            right: 20,
            top: 0,
            bottom: 0,
            justifyContent: "center",
          }}
        >
          {rightAction}
        </View>
      )}
    </View>
  )
}
