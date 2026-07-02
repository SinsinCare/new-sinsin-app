export function clampWaterIntake(amount: number): number {
  return Math.max(0, amount)
}

export function getAppliedWaterDelta(
  currentIntake: number,
  requestedDelta: number,
): number {
  const current = clampWaterIntake(currentIntake)
  const next = clampWaterIntake(current + requestedDelta)
  return next - current
}
