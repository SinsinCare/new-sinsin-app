// 배럴(@/src/services)을 거치면 services/index -> data/index -> 이 파일 로 순환합니다.
// Metro 가 "uninitialized values" 를 경고하는 실제 사이클이라 core 를 직접 참조합니다.
import { api } from "../core"
import type {
  BloodGlucoseUpsertRequest,
  BloodMetricsResponse,
  BloodPressureUpsertRequest,
} from "@/src/types/bloodMetrics"

function rethrowRequestError(error: unknown): never {
  throw error
}

export const bloodMetricsService = {
  async updateBloodPressure(
    body: BloodPressureUpsertRequest,
  ): Promise<BloodMetricsResponse> {
    try {
      const response = await api.post("/blood-pressure-records", body)
      return response.data as BloodMetricsResponse
    } catch (error) {
      rethrowRequestError(error)
    }
  },

  async updateBloodGlucose(
    body: BloodGlucoseUpsertRequest,
  ): Promise<BloodMetricsResponse> {
    try {
      const response = await api.post("/blood-glucose-records", body)
      return response.data as BloodMetricsResponse
    } catch (error) {
      rethrowRequestError(error)
    }
  },
}
