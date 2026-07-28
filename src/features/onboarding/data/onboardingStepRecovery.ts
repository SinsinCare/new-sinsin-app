/**
 * Converts a persisted question index into a safe index for the steps returned
 * by the current onboarding configuration. An empty configuration has no
 * valid question index and must stay recoverable from the welcome phase.
 */
export function resolveOnboardingStepIndex(
  persistedStepIndex: number,
  stepCount: number,
): number | null {
  if (stepCount <= 0) return null

  if (!Number.isFinite(persistedStepIndex)) return 0

  return Math.min(Math.max(Math.trunc(persistedStepIndex), 0), stepCount - 1)
}
