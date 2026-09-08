import {
  Easing,
  FadeInDown,
  FadeOut,
  LinearTransition,
  ReduceMotion,
} from "react-native-reanimated"
import { MOTION } from "@/src/theme/surface"

export const RECORD_SPRING = {
  ...MOTION.spring,
  reduceMotion: ReduceMotion.System,
}
export const RECORD_TIMING = {
  duration: 220,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
  reduceMotion: ReduceMotion.System,
}
export const recordEnter = FadeInDown.duration(240).reduceMotion(
  ReduceMotion.System,
)
export const recordExit = FadeOut.duration(140).reduceMotion(
  ReduceMotion.System,
)
export const recordLayout = LinearTransition.duration(220).reduceMotion(
  ReduceMotion.System,
)
