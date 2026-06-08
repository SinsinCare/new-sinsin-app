import { api } from "../core/apiClient"
import type { ApiResponse } from "../../types"

export interface KidneyProfile {
  ckdStage: string | null
  ckdStageLabel: string | null
  isDialysis: boolean
  heightCm: number | null
  weightKg: number | null
  weightRecordedAt: string | null
  diagnosisDate: string | null
  diagnosisCauses?: string[]
  diagnosisCauseOther?: string | null
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
