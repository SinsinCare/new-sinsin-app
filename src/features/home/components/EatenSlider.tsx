import { useMemo, useState } from "react"
import { LayoutChangeEvent, View } from "react-native"
import { Text, XStack } from "tamagui"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"
import { tokens } from "@/src/theme/tokens"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { EATEN_STEPS, THUMB_SIZE } from "../data/foodEditConstants"

const SNAP_SPRING = { damping: 18, stiffness: 220 }
const STEP_COUNT = EATEN_STEPS.length

interface EatenSliderProps {
  value: number // 0 ~ STEP_COUNT-1
  onChange: (step: number) => void
}

/**
 * 섭취량 4단계 슬라이더. 드래그는 gesture-handler + reanimated 로 UI 스레드에서
 * 처리해 손가락을 그대로 따라오고(매 프레임 setState 없음), 손을 떼면 가까운 단계로 스냅한다.
 * (AppBottomSheet 의 Gesture.Pan + shared value 패턴과 동일)
 */
export function EatenSlider({ value, onChange }: EatenSliderProps) {
  const isDarkMode = useAppColorScheme() === "dark"
  const [measured, setMeasured] = useState(false)
  const trackW = useSharedValue(0)
  const thumbX = useSharedValue(0)
  const lastStep = useSharedValue(value)

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetX([-6, 6]) // 가로 드래그는 슬라이더가
      .failOffsetY([-12, 12]) // 세로 드래그는 ScrollView 에 양보
      .onUpdate((e) => {
        const w = trackW.value
        if (w === 0) return
        const cx = Math.max(0, Math.min(e.x, w))
        thumbX.value = cx - THUMB_SIZE / 2 // 손가락 그대로 추종
        const step = Math.max(
          0,
          Math.min(STEP_COUNT - 1, Math.floor(cx / (w / STEP_COUNT))),
        )
        if (step !== lastStep.value) {
          lastStep.value = step
          runOnJS(onChange)(step)
        }
      })
      .onEnd((e) => {
        const w = trackW.value
        if (w === 0) return
        const cx = Math.max(0, Math.min(e.x, w))
        const step = Math.max(
          0,
          Math.min(STEP_COUNT - 1, Math.floor(cx / (w / STEP_COUNT))),
        )
        thumbX.value = withSpring(
          ((2 * step + 1) / (2 * STEP_COUNT)) * w - THUMB_SIZE / 2,
          SNAP_SPRING,
        )
        if (step !== lastStep.value) {
          lastStep.value = step
          runOnJS(onChange)(step)
        }
      })

    const tap = Gesture.Tap().onEnd((e) => {
      const w = trackW.value
      if (w === 0) return
      const cx = Math.max(0, Math.min(e.x, w))
      const step = Math.max(
        0,
        Math.min(STEP_COUNT - 1, Math.floor(cx / (w / STEP_COUNT))),
      )
      thumbX.value = withSpring(
        ((2 * step + 1) / (2 * STEP_COUNT)) * w - THUMB_SIZE / 2,
        SNAP_SPRING,
      )
      if (step !== lastStep.value) {
        lastStep.value = step
        runOnJS(onChange)(step)
      }
    })

    return Gesture.Race(pan, tap)
  }, [onChange, thumbX, trackW, lastStep])

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }))

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width
    trackW.value = w
    thumbX.value = ((2 * value + 1) / (2 * STEP_COUNT)) * w - THUMB_SIZE / 2
    setMeasured(true)
  }

  return (
    <>
      <GestureDetector gesture={gesture}>
        <View
          onLayout={onLayout}
          hitSlop={{ top: 12, bottom: 12 }}
          style={{ height: THUMB_SIZE + 8, justifyContent: "center" }}
        >
          <View
            style={{
              height: 30,
              backgroundColor: tokens.color.deleteBg.val,
              borderRadius: 15,
            }}
          />
          {measured && (
            <Animated.View
              style={[
                {
                  position: "absolute",
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                  borderRadius: THUMB_SIZE / 2,
                  backgroundColor: tokens.color.pureWhite.val,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 3,
                },
                thumbStyle,
              ]}
            />
          )}
        </View>
      </GestureDetector>
      <XStack marginTop="$2">
        {EATEN_STEPS.map((label, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <Text
              fontSize={13}
              fontWeight={i === value ? 500 : 400}
              color={
                i === value
                  ? isDarkMode
                    ? "$textDark"
                    : "$color"
                  : "$colorSubtle"
              }
            >
              {label}
            </Text>
          </View>
        ))}
      </XStack>
    </>
  )
}
