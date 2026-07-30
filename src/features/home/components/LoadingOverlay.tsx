import { useEffect, useRef, useState } from "react"
import { Modal, TouchableOpacity } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { Text, View } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { Icon } from "@/src/shared/components"
import { tokens } from "@/src/theme/tokens"
import type { FoodAnalysisStatus } from "@/src/types"
import { useTranslation } from "react-i18next"

interface LoadingOverlayProps {
  visible: boolean
  message: string
  onDismiss?: () => void
  status?: FoodAnalysisStatus | null
}

const TIP_KEYS = [
  "foodLoading.tips.first",
  "foodLoading.tips.second",
  "foodLoading.tips.third",
  "foodLoading.tips.fourth",
  "foodLoading.tips.fifth",
] as const

function getRandomTipIndex() {
  return Math.floor(Math.random() * TIP_KEYS.length)
}

export function LoadingOverlay({
  visible,
  message,
  onDismiss,
  status,
}: LoadingOverlayProps) {
  const { t } = useTranslation("common")
  const [dots, setDots] = useState(".")
  const [tipIndex, setTipIndex] = useState(getRandomTipIndex)
  const [showDismiss, setShowDismiss] = useState(false)
  const floatY = useSharedValue(0)
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }))
  const isDarkMode = useAppColorScheme() === "dark"
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusMessage =
    status === "QUEUED"
      ? t("foodLoading.status.QUEUED")
      : status === "PERCEIVING"
        ? t("foodLoading.status.PERCEIVING")
        : status === "RESOLVING"
          ? t("foodLoading.status.RESOLVING")
          : message

  useEffect(() => {
    if (visible) {
      setShowDismiss(false)
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
        setTipIndex(getRandomTipIndex())
      }, 7000)

      dismissTimerRef.current = setTimeout(() => {
        setShowDismiss(true)
      }, 3000)

      return () => {
        clearInterval(dotsInterval)
        clearInterval(tipInterval)
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
      }
    } else {
      floatY.value = 0
      setDots(".")
      setTipIndex(getRandomTipIndex())
      setShowDismiss(false)
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
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
        {/* X 버튼: 3초 후 표시 */}
        {showDismiss && onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            style={{
              position: "absolute",
              top: 56,
              right: 20,
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="close"
              size={26}
              color={
                isDarkMode ? tokens.color.textDark.val : tokens.color.grey3.val
              }
            />
          </TouchableOpacity>
        )}

        <Animated.View style={floatStyle}>
          <Icon name="loading" size={55} />
        </Animated.View>
        <Text
          fontSize={18}
          fontWeight="600"
          marginTop="$4"
          color={isDarkMode ? "$textDark" : "$black"}
        >
          {`${statusMessage}${dots}`}
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
          {t(TIP_KEYS[tipIndex])}
        </Text>

        {showDismiss && onDismiss && (
          <Text
            fontSize={13}
            color="$colorSubtle"
            textAlign="center"
            marginTop="$6"
            marginHorizontal="$6"
            lineHeight={18}
          >
            {t("foodLoading.dismissHint")}
          </Text>
        )}
      </View>
    </Modal>
  )
}
