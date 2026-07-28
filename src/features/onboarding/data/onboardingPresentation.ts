import { spacing } from "@/src/design-system-v2/tokens/spacing"

export const COMPLETION_PARTICLE_DURATION_MS = 2700

export const ONBOARDING_SCROLL_CONTENT_STYLE = {
  flexGrow: 1,
  paddingHorizontal: spacing[20],
  paddingTop: spacing[32],
  paddingBottom: spacing[24],
} as const

type OnboardingPhase = "welcome" | "steps" | "complete"

export type OnboardingLoadingPresentation = "screen" | "cta" | "idle"

export function getOnboardingLoadingPresentation(
  isInitializing: boolean,
  isLoadingSteps: boolean,
): OnboardingLoadingPresentation {
  if (isInitializing) return "screen"
  if (isLoadingSteps) return "cta"
  return "idle"
}

export function shouldShowOnboardingQuestionLoadError(
  isInitializing: boolean,
  isLoadingSteps: boolean,
  hasQuestionLoadError: boolean,
): boolean {
  return !isInitializing && !isLoadingSteps && hasQuestionLoadError
}

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
