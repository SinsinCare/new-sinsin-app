import { WATER_MAX_ML } from "../data/hydrationConstants"

export function clampWaterIntake(amount: number): number {
  return Math.min(WATER_MAX_ML, Math.max(0, amount))
}

export function getAppliedWaterDelta(
  currentIntake: number,
  requestedDelta: number,
): number {
  const current = clampWaterIntake(currentIntake)
  const next = clampWaterIntake(current + requestedDelta)
  return next - current
}
