import type { EdemaObservation } from "@/src/features/home/utils/edemaEntry"
import {
  WeightEdemaResponse,
  WeightRangeRecord,
  WeightRangeResponse,
} from "@/src/types/weightEdema"
// 배럴(@/src/services)을 거치면 services/index -> data/index -> 이 파일 로 순환합니다.
// Metro 가 "uninitialized values" 를 경고하는 실제 사이클이라 core 를 직접 참조합니다.
import { api } from "../core"
import { EdemaLevel } from "@/src/features/home/types"

export const weightEdemaService = {
  async updateWeight(
    weightKg: number,
    date: string,
  ): Promise<WeightEdemaResponse> {
    const response = await api.post("/weight-records", { weightKg, date })
    return response.data as WeightEdemaResponse
  },

  /** from~to(포함)의 체중 기록. 체중 시트의 7일 추세가 쓴다. */
  async fetchWeightRecords(
    from: string,
    to: string,
  ): Promise<WeightRangeRecord[]> {
    const response = await api.get("/weight-records", {
      params: { from, to },
    })
    const data = response.data as WeightRangeResponse
    return data.result?.records ?? []
  },

  async updateEdema(
    edemaLevel: EdemaLevel,
    date: string,
    observations?: EdemaObservation[],
  ): Promise<WeightEdemaResponse> {
    const response = await api.post("/edema-records", {
      edemaLevel,
      date,
      ...(observations ? { observations } : {}),
    })
    // Older APIs may silently discard new fields. Never acknowledge a partial record as saved.
    if (
      observations &&
      JSON.stringify(response.data?.result?.observations) !==
        JSON.stringify(observations)
    ) {
      throw new Error("Edema observation acknowledgement missing")
    }
    return response.data as WeightEdemaResponse
  },
}
