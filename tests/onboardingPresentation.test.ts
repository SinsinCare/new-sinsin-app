import {
  COMPLETION_PARTICLE_DURATION_MS,
  normalizeOnboardingSubtitle,
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
})
