// 배럴(@/src/services)을 거치면 services/index -> data/index -> 이 파일 로 순환합니다.
// Metro 가 "uninitialized values" 를 경고하는 실제 사이클이라 core 를 직접 참조합니다.
import { api } from "../core"
import type {
  BloodGlucoseRangeRecord,
  BloodGlucoseRangeResponse,
  BloodGlucoseUpsertRequest,
  BloodMetricsResponse,
  BloodPressureRangeRecord,
  BloodPressureRangeResponse,
  BloodPressureUpsertRequest,
} from "@/src/types/bloodMetrics"

export const bloodMetricsService = {
  async updateBloodPressure(
    body: BloodPressureUpsertRequest,
  ): Promise<BloodMetricsResponse> {
    const response = await api.post("/blood-pressure-records", body)
    return response.data as BloodMetricsResponse
  },

  async updateBloodGlucose(
    body: BloodGlucoseUpsertRequest,
  ): Promise<BloodMetricsResponse> {
    const response = await api.post("/blood-glucose-records", body)
    return response.data as BloodMetricsResponse
  },

  /**
   * from~to(포함)의 혈압 기록. 기록 페이지의 이력 표가 쓴다.
   *
   * 일간 분석은 그날의 **대표 한 건**만 준다 — 마이그레이션 093 이후 하루에 여러 칸이
   * 있을 수 있으므로 표를 그리려면 창을 따로 열어야 한다(혈당과 같은 모양).
   */
  async fetchBloodPressureRecords(
    from: string,
    to: string,
  ): Promise<BloodPressureRangeRecord[]> {
    const response = await api.get("/blood-pressure-records", {
      params: { from, to },
    })
    const data = response.data as BloodPressureRangeResponse
    return data.result?.records ?? []
  },

  /**
   * from~to(포함)의 혈당 기록. 통계의 추이선이 쓴다.
   *
   * 일간 분석(`date-analysis`)으로는 하루치만 오므로 창을 훑으려면 날짜 수만큼 요청을
   * 날려야 했다 — 체중(`fetchWeightRecords`)과 같은 모양으로 한 번에 받는다.
   */
  async fetchBloodGlucoseRecords(
    from: string,
    to: string,
  ): Promise<BloodGlucoseRangeRecord[]> {
    const response = await api.get("/blood-glucose-records", {
      params: { from, to },
    })
    const data = response.data as BloodGlucoseRangeResponse
    return data.result?.records ?? []
  },
}
