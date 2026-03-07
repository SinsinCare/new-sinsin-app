import { FoodCameraAnalyzeResult } from "@/src/types"
import { THUMB_SIZE } from "../data/foodEditConstants"

export function getDefaultMealName(
  result: FoodCameraAnalyzeResult | null,
): string {
  return (
    result?.foods
      .slice(0, 2)
      .map((f) => f.name)
      .join("와 ") ?? ""
  )
}

export function getInitialEatenStep(
  eatenPercentage: number | undefined,
): number {
  // eatenPercentage is 0–100 integer from the API
  const pct = eatenPercentage ?? 100
  return Math.min(3, Math.max(0, Math.round((pct / 100) * 4) - 1))
}

export function calcThumbPosition(step: number, trackWidth: number): number {
  return ((2 * step + 1) / 8) * trackWidth - THUMB_SIZE / 2
}
