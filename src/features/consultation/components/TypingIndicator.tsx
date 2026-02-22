import { useEffect, useRef } from "react"
import { Animated, Easing, View } from "react-native"
import { XStack } from "tamagui"

const DARK_COLOR = "#2A2E38"
const LIGHT_COLOR = "#A5A5AF"
const AVATAR_COLOR = "#D9D9DF"

export function TypingIndicator() {
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
  }, [colorAnim])

  const animatedColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [DARK_COLOR, LIGHT_COLOR],
  })

  return (
    <XStack alignItems="center" paddingHorizontal="$4" gap="$3">
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: AVATAR_COLOR,
        }}
      />
      <Animated.Text
        style={{
          fontSize: 14,
          fontFamily: "PretendardKR-Medium",
          color: animatedColor,
        }}
      >
        답변을 신중하게 고민하고 있어요
      </Animated.Text>
    </XStack>
  )
}
