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

  it("localizes the same-step follow-up without changing its answer keys", async () => {
    // 투석·이식은 병기와 직교하는 축이라 따로 물어야 하는데, 스텝을 하나 더 만들면
    // 온보딩이 11개가 된다. 그래서 1단계 안에 후속 질문으로 붙어 있다 — 이 테스트는
    // 그 두 번째 축도 본 선택지와 똑같이 번역되고, **키는 그대로 남는지**를 잠근다.
    // 키가 흔들리면 서버가 병기와 치료를 갈라 읽지 못한다.
    await i18n.changeLanguage("en")

    const localized = localizeOnboardingStep(
      {
        step: 1,
        title: "현재 신장 상태를 알려주세요",
        subTitle: "",
        type: "only",
        values: [{ key: "STAGE_5", value: "5기 (eGFR 15 미만)" }],
        followUp: {
          title: "투석이나 이식을 받고 계신가요?",
          values: [
            { key: "KRT_NONE", value: "아니요" },
            { key: "KRT_HEMODIALYSIS", value: "혈액투석" },
            { key: "KRT_PERITONEAL", value: "복막투석" },
            { key: "KRT_TRANSPLANT", value: "이식받았어요" },
          ],
          requiredFor: ["STAGE_4", "STAGE_5", "UNKNOWN"],
          defaultKey: "KRT_NONE",
        },
      },
      true,
    )

    expect(localized.followUp?.title).toBe(
      "Are you on dialysis or have you had a transplant?",
    )
    expect(localized.followUp?.values).toEqual([
      { key: "KRT_NONE", value: "No" },
      { key: "KRT_HEMODIALYSIS", value: "Hemodialysis" },
      { key: "KRT_PERITONEAL", value: "Peritoneal dialysis" },
      { key: "KRT_TRANSPLANT", value: "I’ve had a transplant" },
    ])
    // 판정 규칙은 서버가 정한다 — 번역이 건드리면 안 된다.
    expect(localized.followUp?.requiredFor).toEqual([
      "STAGE_4",
      "STAGE_5",
      "UNKNOWN",
    ])
    expect(localized.followUp?.defaultKey).toBe("KRT_NONE")
  })

  it("keeps a follow-up-less step untouched", () => {
    // 구버전 서버는 followUp 을 안 내려준다. 그때 화면이 비면 안 된다.
    const localized = localizeOnboardingStep(
      {
        step: 3,
        title: "함께 관리하는 질환이 있나요?",
        subTitle: "",
        type: "multi",
        values: [{ key: "KIDNEY_STONE", value: "신장결석" }],
      },
      true,
    )

    expect(localized.followUp).toBeNull()
    // 결석은 병기가 아니라 동반질환이라 3단계에서 번역된다.
    expect(localized.values[0]).toEqual({
      key: "KIDNEY_STONE",
      value: "신장결석",
    })
  })
})
