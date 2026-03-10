import { WeightEdemaResponse } from "@/src/types/weightEdema"
import { api } from "@/src/services"
import { isAxiosError } from "axios"
import { EdemaLevel } from "@/src/features/home/types"

export const weightEdemaService = {
  async updateWeight(
    weightKg: number,
    date: string,
  ): Promise<WeightEdemaResponse> {
    try {
      const response = await api.post("/weight-records", { weightKg, date })
      return response.data as WeightEdemaResponse
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.message) {
        throw new Error(err.response.data.message)
      }
      throw err
    }
  },

  async updateEdema(
    edemaLevel: EdemaLevel,
    date: string,
  ): Promise<WeightEdemaResponse> {
    try {
      const response = await api.post("/edema-records", { edemaLevel, date })
      return response.data as WeightEdemaResponse
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.message) {
        throw new Error(err.response.data.message)
      }
      throw err
    }
  },
}
