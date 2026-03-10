import { tokens } from "@/src/theme/tokens"

export const QUICK_ADD_OPTIONS: readonly number[] = [
  50, 100, 500, 1000,
] as const

export const SVG_WIDTH = 130
export const SVG_HEIGHT = 60
export const FONT_SIZE = 50
export const PCT_X = 85

export const TEXT_BASELINE = SVG_HEIGHT - 8 // 52
export const CAP_H = Math.round(FONT_SIZE * 0.72) // 32

export const DEFAULT_DAILY_GOAL: number = 1500

export const WATER_COLORS = {
  percentBg: tokens.color.waterPercentBg.val,
  percentBgDark: tokens.color.waterPercentBgDark.val,
  gradientTop: tokens.color.waterFillTop.val,
  gradientBottom: tokens.color.waterFillBottom.val,
} as const
