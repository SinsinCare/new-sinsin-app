/**
 * 건강검진 분석 API 클라이언트 (`POST /health-check/analysis`).
 *
 * `nhisService` 와 같은 `/health-check` 아래에 있지만 파일을 나눈 이유: 저쪽은 목이 없어서
 * 목 모드에서 쓸 수 없고, 이 화면들은 목으로 볼 수 있어야 한다(실서버에서 데이터를 만들려면
 * 실제 간편인증을 거쳐야 한다). 목 분기를 저 파일에 섞으면 옛 대시보드 화면의 동작까지 바뀐다.
 */

import { api } from "../core"
import { isMockMode } from "../../config/appConfig"
import type { HealthAnalysis } from "@/src/types/healthAnalysis"
import { MAX_ANALYSIS_RESULTS } from "@/src/types/healthAnalysis"
import { mockHealth } from "./mock/mockHealthData"
import { analyzeLocally } from "./mock/mockHealthAnalysis"

export const healthAnalysisService = {
  /**
   * 선택한 검진 회차들을 분석한다.
   *
   * 빈 배열이면 서버가 400 을 준다. 화면은 그 전에 CTA 를 막아야 하지만, 여기서도
   * 네트워크를 낭비하지 않도록 먼저 걸러 준다.
   */
  async analyze(resultIds: number[]): Promise<HealthAnalysis> {
    const ids = resultIds.slice(0, MAX_ANALYSIS_RESULTS)
    if (ids.length === 0) {
      throw new Error("분석할 검진 결과를 하나 이상 선택해 주세요.")
    }

    if (isMockMode()) {
      const details = mockHealth.ascendingDetails(ids)
      // 서버는 남의 resultId 를 조용히 무시하고, 전부 무시되면 400 이다. 목도 같게 둔다.
      if (details.length === 0) {
        throw new Error("분석할 검진 결과를 하나 이상 선택해 주세요.")
      }
      return new Promise((resolve) =>
        setTimeout(() => resolve(analyzeLocally(details)), 600),
      )
    }

    const { data } = await api.post("/health-check/analysis", {
      resultIds: ids,
    })
    return data.result
  },
}
