import { useEffect } from "react"
import { View } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated"

export function ChatHistoryCardSkeleton() {
  const colorScheme = useAppColorScheme()
  const isDarkMode = colorScheme === "dark"

  const opacity = useSharedValue(1)

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    )
  }, [opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  const barColor = isDarkMode ? "#3E3E44" : "#E8E8ED"

  return (
    <View
      style={{
        backgroundColor: isDarkMode ? tokens.color.inputBgDark.val : tokens.color.offWhite.val,
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 14,
      }}
    >
      <Animated.View style={[{ gap: 8 }, animatedStyle]}>
        {/* Title row */}
        <View
          style={{
            width: "60%",
            height: 20,
            borderRadius: 4,
            backgroundColor: barColor,
          }}
        />

        {/* Content rows */}
        <View style={{ gap: 6 }}>
          <View
            style={{
              width: "100%",
              height: 14,
              borderRadius: 4,
              backgroundColor: barColor,
            }}
          />
          <View
            style={{
              width: "75%",
              height: 14,
              borderRadius: 4,
              backgroundColor: barColor,
            }}
          />
        </View>

        {/* Timestamp */}
        <View
          style={{
            width: "30%",
            height: 13,
            borderRadius: 4,
            backgroundColor: barColor,
          }}
        />
      </Animated.View>
    </View>
  )
}
