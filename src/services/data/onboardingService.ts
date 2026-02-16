import type { OnboardingStep, OnboardingSubmitRequest } from "../../types"
import { isMockMode } from "../../config/appConfig"

export const onboardingService = {
  async getSteps(): Promise<OnboardingStep[]> {
    if (isMockMode()) {
      const { mockOnboardingService } = require("./mock/mockOnboardingService") // eslint-disable-line @typescript-eslint/no-require-imports
      return mockOnboardingService.getSteps()
    }
    // TODO: 백엔드 API 연동
    // const response = await axios.get(`${BACKEND_URL}/onboarding/steps`)
    // return response.data.steps
    return []
  },

  async submitAnswers(request: OnboardingSubmitRequest): Promise<void> {
    if (isMockMode()) {
      const { mockOnboardingService } = require("./mock/mockOnboardingService") // eslint-disable-line @typescript-eslint/no-require-imports
      return mockOnboardingService.submitAnswers(request)
    }
    // TODO: 백엔드 API 연동
    // await axios.post(`${BACKEND_URL}/onboarding/submit`, request)
  },
}
