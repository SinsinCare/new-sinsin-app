import { WeightEdemaResponse } from "@/src/types/weightEdema"
// 배럴(@/src/services)을 거치면 services/index -> data/index -> 이 파일 로 순환합니다.
// Metro 가 "uninitialized values" 를 경고하는 실제 사이클이라 core 를 직접 참조합니다.
import { api } from "../core"
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
