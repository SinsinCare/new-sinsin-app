import { api } from "@/src/services"
import { isAxiosError } from "axios"
import type {
  BloodGlucoseUpsertRequest,
  BloodMetricsResponse,
  BloodPressureUpsertRequest,
} from "@/src/types/bloodMetrics"

function rethrowApiMessage(error: unknown): never {
  if (isAxiosError(error) && error.response?.data?.message) {
    throw new Error(error.response.data.message)
  }
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
      rethrowApiMessage(error)
    }
  },

  async updateBloodGlucose(
    body: BloodGlucoseUpsertRequest,
  ): Promise<BloodMetricsResponse> {
    try {
      const response = await api.post("/blood-glucose-records", body)
      return response.data as BloodMetricsResponse
    } catch (error) {
      rethrowApiMessage(error)
    }
  },
}
