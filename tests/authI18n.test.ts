import i18n from "../src/i18n"
import enAuth from "../src/i18n/locales/en/auth.json"
import koAuth from "../src/i18n/locales/ko/auth.json"
import { getSignupStepCopy } from "../src/features/auth/data/signupSteps"
import {
  formatBirthDateInput,
  getBirthDateInputState,
} from "../src/features/auth/data/dateUtils"
import { localizeOnboardingStep } from "../src/features/onboarding/data"

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix]
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

describe("auth and onboarding i18n", () => {
  afterEach(async () => {
    await i18n.changeLanguage("ko")
  })

  it("keeps Korean and English locale keys in parity", () => {
    expect(leafKeys(enAuth).sort()).toEqual(leafKeys(koAuth).sort())
  })

  it("updates signup copy when the app language changes", async () => {
    await i18n.changeLanguage("en")

    expect(getSignupStepCopy().nickname.title).toBe("What should we call you?")
    expect(getSignupStepCopy().phone.label).toBe("Mobile number")
    expect(getSignupStepCopy().birth.placeholder).toBe("MM/DD/YYYY")
    expect(formatBirthDateInput("12251990")).toBe("12/25/1990")
    expect(
      getBirthDateInputState("12/25/1990", new Date("2026-07-28T00:00:00Z"))
        .parts,
    ).toEqual({ year: "1990", month: "12", day: "25" })
  })

  it("localizes server onboarding copy without changing answer keys", async () => {
    await i18n.changeLanguage("en")

    const localized = localizeOnboardingStep(
      {
        step: 1,
        title: "현재 신장 상태를 알려주세요",
        subTitle: "잘 모르셔도 괜찮아요.",
        type: "only",
        values: [
          { key: "STAGE_1", value: "1기 (eGFR 90 이상)" },
          { key: "UNKNOWN", value: "잘 모르겠어요" },
        ],
      },
      true,
    )

    expect(localized.title).toBe("What is your current CKD stage?")
    expect(localized.values).toEqual([
      { key: "STAGE_1", value: "Stage 1 (eGFR 90 or higher)" },
      { key: "UNKNOWN", value: "I’m not sure" },
    ])
  })
})
