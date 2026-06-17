import { WeightEdemaResponse } from "@/src/types/weightEdema"
import { api } from "@/src/services"
import { isAxiosError } from "axios"
import { EdemaLevel } from "@/src/features/home/types"

function hasFieldErrors(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    "fieldErrors" in data &&
    Array.isArray(data.fieldErrors)
  )
}

export const weightEdemaService = {
  async updateWeight(
    weightKg: number,
    date: string,
  ): Promise<WeightEdemaResponse> {
    try {
      const response = await api.post("/weight-records", { weightKg, date })
      return response.data as WeightEdemaResponse
    } catch (err) {
      if (isAxiosError(err) && hasFieldErrors(err.response?.data)) {
        throw err
      }
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
      if (isAxiosError(err) && hasFieldErrors(err.response?.data)) {
        throw err
      }
      if (isAxiosError(err) && err.response?.data?.message) {
        throw new Error(err.response.data.message)
      }
      throw err
    }
  },
}
