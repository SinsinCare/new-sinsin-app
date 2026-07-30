import { api } from "@/src/services/core/apiClient"

import type { MealReport } from "../types/report"

/**
 * 한 끼 리포트 조회.
 *
 * 첫 호출에 서버가 만들어 저장하고, 이후에는 같은 문장을 돌려준다.
 * 그래서 화면은 재조회를 두려워하지 않아도 된다.
 */
export async function fetchMealReport(
  analysisId: number,
  params?: { date?: string; mealType?: string },
): Promise<MealReport> {
  // baseURL 에 이미 /api/v1 이 들어 있다. 여기에 또 붙이면 /api/v1/api/v1/... 이 된다.
  const res = await api.get(
    `/food-camera/analysis-results/${analysisId}/report`,
    {
      params: {
        ...(params?.date ? { date: params.date } : {}),
        ...(params?.mealType ? { mealType: params.mealType } : {}),
      },
    },
  )
  return (res.data.result ?? res.data.data) as MealReport
}
