import { api } from "../core"
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
    const response = await api.get(`/health-check/auth-methods`)
    return response.data.result
  },

  /*
   * 건강검진 조회를 시작합니다. 간편인증(카카오/PASS)을 통해 1차 CODEF 요청을 발송합니다.
   *
   * status=PENDING: 앱에서 인증 완료 후 /confirm/{requestId}를 호출해주세요.
   * status=SUCCESS: 즉시 조회 완료. /results에서 결과를 확인하세요.
   * */
  async healthCheckRequest(
    authInfo: HealthCheckRequestRq,
  ): Promise<HealthCheckRequestRs> {
    console.log('info', authInfo)
    const response = await api.post(`/health-check/request`, authInfo)
    return response.data.result
  },

  /*
   * 앱에서 간편인증 완료 후 이 API를 호출합니다. 2차 CODEF 요청을 통해 결과를 가져옵니다.
   *
   * status=SUCCESS: 조회 완료. resultId로 상세 조회 가능.
   * status=PENDING: 아직 인증 미완료. 잠시 후 재시도.
   * status=FAILED: 인증 실패.
   * status=TIMEOUT: 90초 초과.
   * */
  async healthCheckConfirm(requestId: string): Promise<HealthCheckConfirmRs> {
    const response = await api.post(`/health-check/confirm/${requestId}`)
    return response.data.result
  },

  /*
   * 내가 조회한 건강검진 결과 목록을 반환합니다.
   * */
  async getHealthCheckResults(): Promise<HealthCheckResultsRs[]> {
    const response = await api.get(`/health-check/results`)
    return response.data.result
  },

  /*
   * 특정 건강검진 결과의 상세 데이터를 반환합니다.
   * */
  async getHealthCheckResultById(
    resultId: string,
  ): Promise<HealthCheckResultDetailRs> {
    const response = await api.get(`/health-check/results/${resultId}`)
    return response.data.result
  },
}
