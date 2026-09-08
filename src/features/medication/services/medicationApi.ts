import { api } from "@/src/services/core"
import type {
  DrugSearch,
  MedicationCapabilities,
  MedicationDay,
  Plan,
  PlanInput,
  RecognitionResult,
  Slot,
} from "../types"
const ROOT = "/medications/v2"
export const medicationApi = {
  async capabilities(signal?: AbortSignal): Promise<MedicationCapabilities> {
    return (await api.get(`${ROOT}/capabilities`, { signal })).data.result
  },
  async day(date: string, signal?: AbortSignal): Promise<MedicationDay> {
    return (await api.get(`${ROOT}/day/${date}`, { signal })).data.result
  },
  async plans(signal?: AbortSignal): Promise<Plan[]> {
    return (await api.get(`${ROOT}/plans`, { signal })).data.result
  },
  async search(q: string, signal?: AbortSignal): Promise<DrugSearch> {
    return (await api.get(`${ROOT}/search`, { params: { q }, signal })).data
      .result
  },
  async create(plan: PlanInput, requestId: string): Promise<Plan> {
    return (await api.post(`${ROOT}/plans`, { plan, requestId })).data.result
  },
  async update(plan: Plan, requestId: string): Promise<Plan> {
    return (
      await api.put(`${ROOT}/plans/${plan.id}`, {
        plan,
        version: plan.version,
        status: plan.status,
        requestId,
      })
    ).data.result
  },
  async saveDay(
    date: string,
    revision: string,
    changes: { planId: string; slot: Slot; taken: boolean }[],
    requestId: string,
  ): Promise<MedicationDay> {
    return (
      await api.put(`${ROOT}/day/${date}`, { revision, changes, requestId })
    ).data.result
  },
  async recognize(
    photos: { uri: string }[],
    signal: AbortSignal,
  ): Promise<RecognitionResult> {
    const body = new FormData()
    photos.forEach((p, i) =>
      body.append(i === 0 ? "front" : "back", {
        uri: p.uri,
        name: `pill-${i}.jpg`,
        type: "image/jpeg",
      } as unknown as Blob),
    )
    return (
      await api.post(`${ROOT}/recognize`, body, {
        signal,
        timeout: 12000,
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data.result
  },
}
export function isMedicationConflict(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 409
}
