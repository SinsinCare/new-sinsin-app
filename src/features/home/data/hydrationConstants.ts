export const QUICK_ADD_OPTIONS: readonly number[] = [
  50, 100, 500, 1000,
] as const

export const SVG_WIDTH = 140
export const SVG_HEIGHT = 60
export const FONT_SIZE = 55
export const PCT_X = 84

export const TEXT_BASELINE = SVG_HEIGHT - 8 // 52
export const CAP_H = Math.round(FONT_SIZE * 0.72) // 32

export const DEFAULT_DAILY_GOAL: number = 1500

export const WATER_COLORS = {
  backgroundLight: "#e0f2fe",
  gradientStart: "#6BDAFE",
  gradientEnd: "#6BDAFE",
  stroke: "#cbd5e1",
  dropletFill: "#e0f2fe",
  buttonText: "#1d4ed8",
} as const
