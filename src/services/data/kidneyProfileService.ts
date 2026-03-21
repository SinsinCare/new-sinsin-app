import { api } from "../core/apiClient"
import type { ApiResponse } from "../../types"

export interface KidneyProfile {
  ckdStage: string
  ckdStageLabel: string
  isDialysis: boolean
  weightKg: number | null
  weightRecordedAt: string | null
  comorbidities?: string[]
}

export const kidneyProfileService = {
  async getKidneyProfile(): Promise<KidneyProfile> {
    const { data } = await api.get<ApiResponse<KidneyProfile>>(
      "/user/profile/kidney",
    )
    return data.result
  },
}
