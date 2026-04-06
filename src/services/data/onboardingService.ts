import type {
  OnboardingStep,
  OnboardingStepRs,
  OnboardingAnswer,
} from "../../types"
import { isMockMode } from "../../config/appConfig"
import { api } from "../core"
import {
  convertStepRsToSteps,
  convertAnswersToSubmitRq,
} from "@/src/features/onboarding/data"
import { logger } from "@/src/lib/logger"

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
    logger.debug(
      "[onboardingService] submit payload keys",
      Object.keys(request),
    )
    await api.post(`/user/onboarding`, request)
  },
}
