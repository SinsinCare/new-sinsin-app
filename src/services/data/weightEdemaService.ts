import { WeightResponse } from "@/src/types/weightEdema"
import { api } from "@/src/services"
import { isAxiosError } from "axios"

export const weightEdemaService = {
  async updateWeight(weightKg: number, date: string): Promise<WeightResponse> {
    try {
      const response = await api.post("/weight-records", { weightKg, date })
      return response.data as WeightResponse
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.message) {
        throw new Error(err.response.data.message)
      }
      throw err
    }
  },
}
