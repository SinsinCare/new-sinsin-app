import { api } from "@/src/services/core"
import { authenticatedFetch } from "@/src/services/core/authenticatedFetch"
import { getBackendUrl, isMockMode } from "@/src/config/appConfig"
import { ApiError } from "@/src/services/core/apiError"
import { mockRecognize } from "../data/mockRecognition"
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
    // 목 모드는 네트워크를 타지 않는다 — 다른 사진 서비스(`foodCameraService`)와 같은 규칙.
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      return mockRecognize(photos.length)
    }
    /*
      multipart 는 다른 업로더(식단·검사지)와 같이 `authenticatedFetch` 로 보낸다 — axios 에
      Content-Type 을 손으로 박으면 boundary 가 빠져 서버 `readMultipartForm` 이 400 을 낸다.
      실측(2026-09-08): 앞·뒤 2장 판독에 5~16초. 서버 마감 20초보다 길게 둔다.
    */
    const response = await authenticatedFetch(
      `${getBackendUrl()}${ROOT}/recognize`,
      () => {
        const body = new FormData()
        photos.forEach((p, i) =>
          body.append(i === 0 ? "front" : "back", {
            uri: p.uri,
            name: `pill-${i}.jpg`,
            type: "image/jpeg",
          } as unknown as Blob),
        )
        return {
          method: "POST",
          headers: { Accept: "application/json" },
          body: body as unknown as RequestInit["body"],
          signal,
        }
      },
      { timeoutMs: 30000 },
    )
    const json = (await response.json()) as {
      isSuccess?: boolean
      code?: string
      message?: string
      result?: RecognitionResult
    }
    if (!response.ok || json.isSuccess === false || !json.result)
      throw new ApiError(
        json.message ?? "recognize failed",
        json.code ?? `HTTP_${response.status}`,
        response.status,
      )
    return json.result
  },
}
/** 낙관적 잠금 충돌(409). "이미 등록한 약"(MEDICATION_106)도 409 지만 뜻이 달라 따로 본다. */
export function isMedicationConflict(error: unknown): boolean {
  return (
    !isMedicationDuplicate(error) &&
    ((error as { response?: { status?: number } })?.response?.status === 409 ||
      (error as { statusCode?: number })?.statusCode === 409)
  )
}
export function isMedicationDuplicate(error: unknown): boolean {
  return (error as { code?: string })?.code === "MEDICATION_106"
}
export function isMedicationPlanLimit(error: unknown): boolean {
  return (error as { code?: string })?.code === "MEDICATION_107"
}
