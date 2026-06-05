import { WEIGHT_STEP } from "../data/weightConstants"

const MAX_WEIGHT = 300

export function increaseWeight(current: number): number {
  return Math.min(MAX_WEIGHT, Math.round((current + WEIGHT_STEP) * 10) / 10)
}

export function decreaseWeight(current: number): number {
  return Math.max(0, Math.round((current - WEIGHT_STEP) * 10) / 10)
}
