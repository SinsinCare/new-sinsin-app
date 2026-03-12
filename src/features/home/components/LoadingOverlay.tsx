import { useEffect, useState } from "react"
import { Modal, useColorScheme } from "react-native"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { Text, View } from "tamagui"
import { Icon } from "@/src/shared/components"
import { LOADING_TIPS } from "../data/loadingTips"

interface LoadingOverlayProps {
  visible: boolean
  message: string
}

function getRandomTip() {
  return LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]
}

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  const [dots, setDots] = useState(".")
  const [tip, setTip] = useState(getRandomTip)
  const floatY = useSharedValue(0)
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }))
  const isDarkMode = useColorScheme() === "dark"

  useEffect(() => {
    if (visible) {
      floatY.value = withRepeat(
        withSequence(
          withTiming(-10, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      )
      const dotsInterval = setInterval(() => {
        setDots((d) => (d.length >= 3 ? "." : d + "."))
      }, 500)
      const tipInterval = setInterval(() => {
        setTip(getRandomTip())
      }, 4000)
      return () => {
        clearInterval(dotsInterval)
        clearInterval(tipInterval)
      }
    } else {
      floatY.value = 0
      setDots(".")
      setTip(getRandomTip())
    }
  }, [visible, floatY])

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        flex={1}
        backgroundColor={isDarkMode ? "$appBgDark" : "$appBg"}
        alignItems="center"
        justifyContent="center"
      >
        <Animated.View style={floatStyle}>
          <Icon name="loading" size={55} />
        </Animated.View>
        <Text
          fontSize={18}
          fontWeight="600"
          marginTop="$4"
          color={isDarkMode ? "$textDark" : "$black"}
        >
          {`${message}${dots}`}
        </Text>
        <Text
          fontSize={14}
          fontWeight="500"
          textAlign="center"
          marginTop="$3"
          marginHorizontal="$4"
          color="$colorSubtle"
          lineHeight={20}
        >
          {tip}
        </Text>
      </View>
    </Modal>
  )
}
