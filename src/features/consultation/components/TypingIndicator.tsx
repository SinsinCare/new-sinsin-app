import { useEffect, useRef } from "react"
import { Animated, Easing } from "react-native"
import { XStack, YStack, Text } from "tamagui"
import { GlassmorphicCard } from "@/src/shared/components/GlassmorphicCard"

export function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current
  const dot2 = useRef(new Animated.Value(0)).current
  const dot3 = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const createDotAnimation = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ]),
      )

    const anim = Animated.parallel([
      createDotAnimation(dot1, 0),
      createDotAnimation(dot2, 150),
      createDotAnimation(dot3, 300),
    ])
    anim.start()
    return () => anim.stop()
  }, [dot1, dot2, dot3])

  const dotStyle = (anim: Animated.Value) => ({
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#B3B3B3",
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    }),
  })

  return (
    <YStack alignItems="flex-start" paddingHorizontal="$4" gap="$1.5">
      <GlassmorphicCard
        variant="flat"
        borderColor="$borderColor"
        paddingHorizontal="$4"
        paddingVertical="$3"
      >
        <XStack gap="$2" alignItems="center">
          <XStack gap={6} alignItems="center">
            <Animated.View style={dotStyle(dot1)} />
            <Animated.View style={dotStyle(dot2)} />
            <Animated.View style={dotStyle(dot3)} />
          </XStack>
        </XStack>
      </GlassmorphicCard>
      <Text fontSize={11} color="$grey6" paddingLeft="$1">
        답변을 신중하게 고민중입니다...
      </Text>
    </YStack>
  )
}
