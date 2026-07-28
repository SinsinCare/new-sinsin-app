import {
  canNavigateOnboardingBack,
  getPositiveDecimalValidationError,
  isValidPositiveDecimal,
} from "../src/features/onboarding/data/onboardingValidation"

describe("onboarding numeric validation", () => {
  it.each(["1", "12.5", ".5", "  2.75  "])(
    "accepts the positive decimal %p",
    (value) => {
      expect(isValidPositiveDecimal(value)).toBe(true)
    },
  )

  it.each([
    null,
    undefined,
    "",
    "   ",
    "0",
    "0.0",
    "-1",
    "12kg",
    "1.2.3",
    "12.",
    "Infinity",
    "NaN",
    "1e2",
  ])("rejects the invalid numeric input %p", (value) => {
    expect(isValidPositiveDecimal(value)).toBe(false)
  })

  it.each(["12kg", "1.2.3", "12.", "Infinity", "NaN", "1e2"])(
    "explains the malformed decimal %p",
    (value) => {
      expect(getPositiveDecimalValidationError(value)).toBe(
        "숫자를 입력해주세요",
      )
    },
  )

  it.each(["0", "0.0", "-1"])(
    "explains the non-positive number %p",
    (value) => {
      expect(getPositiveDecimalValidationError(value)).toBe(
        "0보다 큰 값을 입력해주세요",
      )
    },
  )
})

describe("onboarding back navigation guard", () => {
  it("blocks back navigation while submission is in flight", () => {
    expect(canNavigateOnboardingBack(true)).toBe(false)
  })

  it("allows the established back behavior when not submitting", () => {
    expect(canNavigateOnboardingBack(false)).toBe(true)
  })
})
