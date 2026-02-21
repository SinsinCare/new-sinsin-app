import type {
  OnboardingStep,
  OnboardingStepRs,
  OnboardingAnswer,
} from "../../types"
import { isMockMode } from "../../config/appConfig"
import { api } from "@/src/services"
import {
  convertStepRsToSteps,
  convertAnswersToSubmitRq,
} from "@/src/features/onboarding/data"

export const onboardingService = {
  async getSteps(hasCkd: boolean): Promise<OnboardingStep[]> {
    if (isMockMode()) {
      const { mockOnboardingService } = require("./mock/mockOnboardingService") // eslint-disable-line @typescript-eslint/no-require-imports
      return mockOnboardingService.getSteps()
    }

    const response = hasCkd
      ? await api.get(`/user/onboarding/ckd`)
      : await api.get(`/user/onboarding/non-ckd`)
    const rsArray: OnboardingStepRs[] = response.data.result
    return convertStepRsToSteps(rsArray)
  },

  async submitAnswers(
    hasCkd: boolean,
    answers: OnboardingAnswer[],
  ): Promise<void> {
    if (isMockMode()) {
      const { mockOnboardingService } = require("./mock/mockOnboardingService") // eslint-disable-line @typescript-eslint/no-require-imports
      return mockOnboardingService.submitAnswers()
    }
    const request = convertAnswersToSubmitRq(hasCkd, answers)
    console.log('req', request)
    await api.post(`/user/onboarding`, request)
  },
}
