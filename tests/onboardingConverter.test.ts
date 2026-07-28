import { convertStepRsToSteps } from "@/src/features/onboarding/data"
import type { OnboardingStepRs } from "@/src/types/onboarding"

const baseStep: Omit<OnboardingStepRs, "subTitle"> = {
  step: 1,
  flow: "CKD",
  title: "현재 신장 상태를 알려주세요",
  type: "only",
  values: [{ key: "unknown", value: "잘 모르겠어요" }],
}

describe("convertStepRsToSteps", () => {
  it.each([null, undefined])(
    "normalizes a %p API subtitle to null for the client model",
    (subTitle) => {
      const [step] = convertStepRsToSteps([{ ...baseStep, subTitle }])

      expect(step.subTitle).toBeNull()
    },
  )

  it("preserves a non-empty API subtitle for header presentation", () => {
    const [step] = convertStepRsToSteps([
      { ...baseStep, subTitle: "맞춤 건강 관리를 위해 알려주세요" },
    ])

    expect(step.subTitle).toBe("맞춤 건강 관리를 위해 알려주세요")
  })
})
