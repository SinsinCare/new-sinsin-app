import { useEffect, useState } from "react"
import { Modal } from "react-native"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { Text, View } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import { Icon } from "@/src/shared/components"

interface LoadingOverlayProps {
  visible: boolean
  message: string
}

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  const [dots, setDots] = useState(".")
  const floatY = useSharedValue(0)
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }))

  useEffect(() => {
    if (visible) {
      floatY.value = withRepeat(
        withSequence(
          withTiming(-10, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      )
      const interval = setInterval(() => {
        setDots((d) => (d.length >= 3 ? "." : d + "."))
      }, 500)
      return () => clearInterval(interval)
    } else {
      floatY.value = 0
      setDots(".")
    }
  }, [visible, floatY])

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        flex={1}
        backgroundColor={tokens.color.appBg.val}
        alignItems="center"
        justifyContent="center"
      >
        <Animated.View style={floatStyle}>
          <Icon name="loading" size={55} />
        </Animated.View>
        <Text fontSize={18} fontWeight="600" marginTop="$4">
          {`${message}${dots}`}
        </Text>
      </View>
    </Modal>
  )
}
