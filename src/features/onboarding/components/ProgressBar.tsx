import { useEffect, useState } from "react"
import { StyleSheet, View } from "react-native"
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"
import { useAuthSurface } from "@/src/features/auth/hooks/useAuthSurface"
import { AUTH_LAYOUT, AUTH_MOTION } from "@/src/features/auth/data/authSurface"

interface ProgressBarProps {
  current: number
  total: number
}

const SPRING = { ...AUTH_MOTION.spring, reduceMotion: ReduceMotion.System }

/**
 * 온보딩 진행바. 가입 스텝과 같은 모양·같은 동작을 쓴다 — 가입에서 온보딩으로
 * 넘어갈 때 진행바 모양이 달라지면 다른 앱에 들어온 것처럼 읽힌다.
 * 좌우 여백 없이 화면을 가로지른다(헤더와 본문의 경계 역할).
 */
export function ProgressBar({ current, total }: ProgressBarProps) {
  const surface = useAuthSurface()
  const [trackWidth, setTrackWidth] = useState(0)
  const ratio = total > 0 ? Math.min((current + 1) / total, 1) : 0
  const fill = useSharedValue(ratio)

  useEffect(() => {
    fill.value = withSpring(ratio, SPRING)
  }, [fill, ratio])

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(fill.value, 0.001) }],
  }))

  return (
    <View
      style={[styles.track, { backgroundColor: surface.hairline }]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          styles.fill,
          { width: trackWidth, backgroundColor: surface.brand },
          fillStyle,
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    height: AUTH_LAYOUT.progressHeight,
    overflow: "hidden",
  },
  fill: {
    height: AUTH_LAYOUT.progressHeight,
    transformOrigin: "left",
  },
})
