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

  // 서버는 이 값들을 원래부터 반환하고 있었는데 타입에 없어서 역직렬화에서 버려졌다.
  // 그 사이 화면들은 하드코딩 표를 그렸고, 90kg 1기 환자가 서버 목표 72g 대신
  // 고정 48g 을 보고 "초과" 판정을 받았다.
  sodiumMg: number | null
  proteinGPerKg: number | null
  potassiumMg: number | null
  phosphorusMg: number | null
  fluidMl: number | null
  /** proteinGPerKg × 최신 체중. 앱이 세 군데서 제각각 계산하던 걸 서버가 준다. */
  proteinGDay: number | null
}

export const kidneyProfileService = {
  async getKidneyProfile(): Promise<KidneyProfile> {
    const { data } = await api.get<ApiResponse<KidneyProfile>>(
      "/user/profile/kidney",
    )
    return data.result
  },
}
