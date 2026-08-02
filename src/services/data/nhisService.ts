import { api } from "../core"
import { isMockMode } from "../../config/appConfig"
import { mockHealth } from "./mock/mockHealthData"
import {
  AuthMethodRs,
  HealthCheckConfirmRs,
  HealthCheckRequestRq,
  HealthCheckRequestRs,
  HealthCheckResultDetailRs,
  HealthCheckResultsRs,
} from "@/src/types/nhis"

export const nhisService = {
  /*
   * 사용 가능한 간편인증 수단(카카오, PASS) 및 통신사 옵션을 조회합니다.
   * */
  async getAuthMethod(): Promise<AuthMethodRs[]> {
    // 목이 없으면 본인인증 화면이 열리지 않는다 — 수단 목록이 비면 제출이 영영 비활성이다.
    if (isMockMode()) return mockHealth.authMethods()
    const response = await api.get(`/health-check/auth-methods`)
    return response.data.result
  },

  /*
   * 건강검진 조회를 시작합니다. 간편인증(카카오/PASS)을 통해 HYPHEN init 요청을 발송합니다.
   *
   * status=PENDING: 인증 앱에서 인증 완료 후 /confirm/{requestId}를 호출해주세요.
   * status=SUCCESS: 즉시 조회 완료. /results에서 결과를 확인하세요.
   * */
  async healthCheckRequest(
    authInfo: HealthCheckRequestRq,
  ): Promise<HealthCheckRequestRs> {
    const response = await api.post(`/health-check/request`, authInfo)
    return response.data.result
  },

  /*
   * 인증 앱에서 간편인증 완료 후 이 API를 호출합니다. HYPHEN sign 요청을 통해 결과를 가져옵니다.
   *
   * status=SUCCESS: 조회 완료. resultId로 상세 조회 가능.
   * status=FAILED: 인증 실패.
   * status=TIMEOUT: 5분 초과.
   * */
  async healthCheckConfirm(requestId: string): Promise<HealthCheckConfirmRs> {
    const response = await api.post(`/health-check/confirm/${requestId}`)
    return response.data.result
  },

  /*
   * 내가 조회한 건강검진 결과 목록을 반환합니다.
   * */
  async getHealthCheckResults(): Promise<HealthCheckResultsRs[]> {
    // 목 모드에서 실제 간편인증을 거칠 수는 없다. 목이 없으면 검진 화면 전부가 빈 채로 열린다.
    if (isMockMode()) return mockHealth.results()
    const response = await api.get(`/health-check/results`)
    return response.data.result
  },

  /*
   * 특정 건강검진 결과의 상세 데이터를 반환합니다.
   * */
  async getHealthCheckResultById(
    resultId: string,
  ): Promise<HealthCheckResultDetailRs> {
    if (isMockMode()) {
      const detail = mockHealth.detail(Number(resultId))
      if (!detail) throw new Error(`mock: 검진 결과 ${resultId} 없음`)
      return detail
    }
    const response = await api.get(`/health-check/results/${resultId}`)
    return response.data.result
  },
}
