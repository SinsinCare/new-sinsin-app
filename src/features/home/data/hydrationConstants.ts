export const QUICK_ADD_OPTIONS: readonly number[] = [
  50, 100, 250, 500,
] as const

export const QUICK_ADD_LABELS: Record<number, string> = {
  250: "1컵",
}

export const SVG_WIDTH = 135
export const SVG_HEIGHT = 60
export const FONT_SIZE = 50
export const PCT_X = 90

export const TEXT_BASELINE = SVG_HEIGHT - 8 // 52
export const CAP_H = Math.round(FONT_SIZE * 0.72) // 32

export const DEFAULT_DAILY_GOAL: number = 1500
export const MAX_WATER_INTAKE: number = 5000

export const WATER_COLORS = {
  percentBg: "#D2DFE3",
  percentBgDark: "#46616A",
  gradientTop: "#6BDAFE",
  gradientBottom: "#30C1F0",
} as const
