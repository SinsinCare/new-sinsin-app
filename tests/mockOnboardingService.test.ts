import { mockOnboardingService } from "@/src/services/data/mock/mockOnboardingService"

describe("mockOnboardingService", () => {
  it("returns the CKD questionnaire for a CKD user", async () => {
    const steps = await mockOnboardingService.getSteps(true)

    expect(steps).toHaveLength(8)
    expect(steps[0]).toMatchObject({
      step: 1,
      title: "현재 신장 상태를 알려주세요",
      type: "only",
    })
  })

  it("returns the non-CKD questionnaire for a non-CKD user", async () => {
    const steps = await mockOnboardingService.getSteps(false)

    expect(steps).toHaveLength(4)
    expect(steps[0]).toMatchObject({
      step: 1,
      title: "신장 건강과 관련해 해당되는 것이 있나요?",
      type: "multi",
    })
    expect(steps[3]).toMatchObject({
      step: 4,
      title: "현재 체중을 알려주세요.",
      type: "input",
    })
  })
})
