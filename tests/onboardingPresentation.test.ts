import {
  COMPLETION_PARTICLE_DURATION_MS,
  ONBOARDING_SCROLL_CONTENT_STYLE,
  getOnboardingLoadingPresentation,
  normalizeOnboardingSubtitle,
  shouldShowOnboardingQuestionLoadError,
  shouldShowOnboardingBackButton,
  shouldPlayCompletionParticles,
} from "../src/features/onboarding/data/onboardingPresentation"

describe("onboarding presentation rules", () => {
  it.each([null, undefined, "", "   "])(
    "treats %p as a missing subtitle",
    (subtitle) => {
      expect(normalizeOnboardingSubtitle(subtitle)).toBeNull()
    },
  )

  it("trims and keeps a real subtitle", () => {
    expect(
      normalizeOnboardingSubtitle("  맞춤 건강 관리를 위해 알려주세요  "),
    ).toBe("맞춤 건강 관리를 위해 알려주세요")
  })

  it("plays the particle once only when Reduce Motion is off", () => {
    expect(shouldPlayCompletionParticles(null)).toBe(false)
    expect(shouldPlayCompletionParticles(true)).toBe(false)
    expect(shouldPlayCompletionParticles(false)).toBe(true)
    expect(COMPLETION_PARTICLE_DURATION_MS).toBe(2700)
  })

  it("shows a back button on the first question so the patient choice can be changed", () => {
    expect(shouldShowOnboardingBackButton("steps", 0)).toBe(true)
    expect(shouldShowOnboardingBackButton("steps", 2)).toBe(true)
    expect(shouldShowOnboardingBackButton("welcome", -1)).toBe(false)
    expect(shouldShowOnboardingBackButton("complete", 0)).toBe(false)
  })

  it("keeps the welcome screen visible while loading questions after confirmation", () => {
    expect(getOnboardingLoadingPresentation(true, false)).toBe("screen")
    expect(getOnboardingLoadingPresentation(false, true)).toBe("cta")
    expect(getOnboardingLoadingPresentation(false, false)).toBe("idle")
  })

  it("shows a retryable question-load error only after loading settles", () => {
    expect(shouldShowOnboardingQuestionLoadError(false, false, true)).toBe(true)
    expect(shouldShowOnboardingQuestionLoadError(true, false, true)).toBe(false)
    expect(shouldShowOnboardingQuestionLoadError(false, true, true)).toBe(false)
    expect(shouldShowOnboardingQuestionLoadError(false, false, false)).toBe(
      false,
    )
  })

  it("keeps onboarding content scrollable above the fixed bottom action", () => {
    expect(ONBOARDING_SCROLL_CONTENT_STYLE.flexGrow).toBe(1)
    expect(
      ONBOARDING_SCROLL_CONTENT_STYLE.paddingBottom,
    ).toBeGreaterThanOrEqual(24)
  })
})
