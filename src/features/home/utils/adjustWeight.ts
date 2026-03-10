import { WEIGHT_STEP } from "../data/weightConstants"

export function increaseWeight(current: number): number {
  return Math.round((current + WEIGHT_STEP) * 10) / 10
}

export function decreaseWeight(current: number): number {
  return Math.round((current - WEIGHT_STEP) * 10) / 10
}
