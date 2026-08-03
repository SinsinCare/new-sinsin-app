import { resolveOnboardingStepIndex } from "../src/features/onboarding/data/onboardingStepRecovery"

describe("onboarding step recovery", () => {
  it("keeps a persisted index that remains in the returned step bounds", () => {
    expect(resolveOnboardingStepIndex(1, 3)).toBe(1)
  })

  it("clamps stale persisted indexes into the returned step bounds", () => {
    expect(resolveOnboardingStepIndex(-1, 3)).toBe(0)
    expect(resolveOnboardingStepIndex(8, 3)).toBe(2)
  })

  it("recovers malformed persisted indexes at the first returned step", () => {
    expect(resolveOnboardingStepIndex(Number.NaN, 3)).toBe(0)
    expect(resolveOnboardingStepIndex(Number.POSITIVE_INFINITY, 3)).toBe(0)
  })

  it("does not create a steps phase index for an empty response", () => {
    expect(resolveOnboardingStepIndex(0, 0)).toBeNull()
  })
})
