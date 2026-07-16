export const COMPLETION_PARTICLE_DURATION_MS = 2700

type OnboardingPhase = "welcome" | "steps" | "complete"

export function normalizeOnboardingSubtitle(
  subtitle: string | null | undefined,
): string | null {
  const normalized = subtitle?.trim()
  return normalized ? normalized : null
}

export function shouldPlayCompletionParticles(
  prefersReducedMotion: boolean | null,
): boolean {
  return prefersReducedMotion === false
}

export function shouldShowOnboardingBackButton(
  phase: OnboardingPhase,
  currentStepIndex: number,
): boolean {
  return phase === "steps" && currentStepIndex >= 0
}
