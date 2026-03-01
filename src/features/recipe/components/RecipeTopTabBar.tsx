import { useCallback, useState } from "react"
import { Pressable, useColorScheme, LayoutChangeEvent } from "react-native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated"
import { XStack, Text } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"

export type RecipeTab = "recipe" | "free"

const TABS: { key: RecipeTab; label: string }[] = [
  { key: "recipe", label: "레시피" },
  { key: "free", label: "자유글" },
]

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

interface RecipeTopTabBarProps {
  activeTab: RecipeTab
  onTabChange: (tab: RecipeTab) => void
  onBookmarkPress: () => void
}

export function RecipeTopTabBar({
  activeTab,
  onTabChange,
  onBookmarkPress,
}: RecipeTopTabBarProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const palette = isDark ? COLORS.dark : COLORS.light

  // Track tab positions for animated underline
  const [tabLayouts, setTabLayouts] = useState<
    Record<string, { x: number; width: number }>
  >({})
  const indicatorX = useSharedValue(0)
  const indicatorWidth = useSharedValue(0)

  const handleTabLayout = useCallback(
    (key: string, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout
      setTabLayouts((prev) => {
        const next = { ...prev, [key]: { x, width } }
        // Update indicator position for the active tab
        if (next[activeTab]) {
          indicatorX.value = withTiming(next[activeTab].x, { duration: 250 })
          indicatorWidth.value = withTiming(next[activeTab].width, {
            duration: 250,
          })
        }
        return next
      })
    },
    [activeTab, indicatorX, indicatorWidth],
  )

  const handleTabPress = useCallback(
    (key: RecipeTab) => {
      onTabChange(key)
      const layout = tabLayouts[key]
      if (layout) {
        indicatorX.value = withTiming(layout.x, { duration: 250 })
        indicatorWidth.value = withTiming(layout.width, { duration: 250 })
      }
    },
    [onTabChange, tabLayouts, indicatorX, indicatorWidth],
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
    <XStack height={48} alignItems="center">
      {/* Tabs area - each tab takes equal width */}
      <XStack flex={1} height="100%" position="relative">
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => handleTabPress(tab.key)}
            onLayout={(e) => handleTabLayout(tab.key, e)}
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <Text
              fontSize="$6"
              fontWeight={activeTab === tab.key ? "700" : "400"}
              color={activeTab === tab.key ? palette.active : palette.inactive}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}

        {/* Animated underline indicator */}
        <Animated.View style={indicatorStyle} />
      </XStack>

      {/* Bookmark button */}
      <Pressable
        onPress={onBookmarkPress}
        hitSlop={8}
        style={{ paddingHorizontal: 20 }}
      >
        <Icon name="bookmark" size={24} color={palette.active} />
      </Pressable>
    </XStack>
  )
}
