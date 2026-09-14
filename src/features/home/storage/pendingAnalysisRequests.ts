import AsyncStorage from "@react-native-async-storage/async-storage"
import type { MealType } from "../types"
import type { FoodAnalysisStatus } from "@/src/types"

export const PENDING_ANALYSIS_REQUESTS_KEY = "@sinsin/pending-analysis"

export interface PendingAnalysisRequest {
  requestId: string
  analysisId?: string
  status?: FoodAnalysisStatus
  mealType: MealType
  imageUri: string | null
  startedAt: number
}

interface KeyValueStorage {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  removeItem?: (key: string) => Promise<void>
}

function isPendingAnalysisRequest(
  value: unknown,
): value is PendingAnalysisRequest {
  if (typeof value !== "object" || value === null) return false
  const item = value as Record<string, unknown>
  return (
    typeof item.requestId === "string" &&
    (item.analysisId === undefined || typeof item.analysisId === "string") &&
    (item.status === undefined || typeof item.status === "string") &&
    typeof item.mealType === "string" &&
    (typeof item.imageUri === "string" || item.imageUri === null) &&
    typeof item.startedAt === "number"
  )
}

export function createPendingAnalysisRequestStorage(storage: KeyValueStorage) {
  const listeners = new Set<(requests: PendingAnalysisRequest[]) => void>()

  function notify(requests: PendingAnalysisRequest[]) {
    listeners.forEach((listener) => listener(requests))
  }

  async function getAll(): Promise<PendingAnalysisRequest[]> {
    const raw = await storage.getItem(PENDING_ANALYSIS_REQUESTS_KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.filter(isPendingAnalysisRequest)
    } catch {
      return []
    }
  }

  async function writeAll(requests: PendingAnalysisRequest[]): Promise<void> {
    if (requests.length === 0 && storage.removeItem) {
      await storage.removeItem(PENDING_ANALYSIS_REQUESTS_KEY)
      notify(requests)
      return
    }
    await storage.setItem(
      PENDING_ANALYSIS_REQUESTS_KEY,
      JSON.stringify(requests),
    )
    notify(requests)
  }

  /*
    add/remove 는 읽고 → 거르고 → 쓰는 세 단계라 원자적이지 않다. 쓰는 쪽이 셋(포그라운드
    분석 훅 · 복구 · 복구된 확인 흐름)이라 두 변경이 겹치면 늦게 쓴 쪽의 옛 스냅샷이 먼저
    쓴 쪽을 덮는다 — 이미 처리해서 지운 요청이 다른 add 에 실려 되살아나고, 복구가 그것을
    다시 열어 준다. 그래서 변경은 한 줄로 세운다: 앞 작업이 끝나야 다음이 읽는다. 실패한
    작업이 줄을 막지 않도록 꼬리는 늘 resolve 로 잇는다. 읽기(getAll)는 줄을 서지 않는다 —
    한 틱 늦은 목록을 보는 것은 무해하고(같은 요청을 한 번 더 살펴볼 뿐), 폴러가 5초마다
    읽으므로 쓰기 뒤에 줄 세우면 읽기가 쓰기를 기다리는 시간이 늘기만 한다.
  */
  let mutationTail: Promise<unknown> = Promise.resolve()
  function enqueueMutation<T>(task: () => Promise<T>): Promise<T> {
    const run = mutationTail.then(task, task)
    mutationTail = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  return {
    getAll,
    add(request: PendingAnalysisRequest): Promise<void> {
      return enqueueMutation(async () => {
        const existing = await getAll()
        const withoutSameRequest = existing.filter(
          (item) => item.requestId !== request.requestId,
        )
        await writeAll([...withoutSameRequest, request])
      })
    },
    remove(requestId: string): Promise<void> {
      return enqueueMutation(async () => {
        const existing = await getAll()
        await writeAll(existing.filter((item) => item.requestId !== requestId))
      })
    },
    subscribe(listener: (requests: PendingAnalysisRequest[]) => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export const pendingAnalysisRequests =
  createPendingAnalysisRequestStorage(AsyncStorage)
