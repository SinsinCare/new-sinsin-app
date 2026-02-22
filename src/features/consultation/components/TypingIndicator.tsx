import { useEffect, useRef } from "react"
import { Animated, Easing, View } from "react-native"
import { useTheme, XStack } from "tamagui"

export function TypingIndicator() {
  const theme = useTheme()
  const darkColor = theme.color?.val ?? "#2A2E38"
  const lightColor = theme.colorSubtle?.val ?? "#A5A5AF"
  const avatarColor = theme.borderColor?.val ?? "#D9D9DF"

  const colorAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(colorAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(colorAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    )
    animation.start()
    return () => animation.stop()
  }, [colorAnim, darkColor, lightColor])

  const animatedColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [darkColor, lightColor],
  })

  return (
    <XStack alignItems="center" paddingHorizontal="$4" gap="$3">
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: avatarColor,
        }}
      />
      <Animated.Text
        style={{
          fontSize: 14,
          lineHeight: 22,
          fontFamily: "PretendardKR-Medium",
          color: animatedColor,
        }}
      >
        답변을 신중하게 고민하고 있어요
      </Animated.Text>
    </XStack>
  )
}
