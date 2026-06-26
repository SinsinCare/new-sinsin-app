import AsyncStorage from "@react-native-async-storage/async-storage"
import type { MealType } from "../types"

export const PENDING_ANALYSIS_REQUESTS_KEY = "@sinsin/pending-analysis"

export interface PendingAnalysisRequest {
  requestId: string
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
    typeof item.mealType === "string" &&
    (typeof item.imageUri === "string" || item.imageUri === null) &&
    typeof item.startedAt === "number"
  )
}

export function createPendingAnalysisRequestStorage(storage: KeyValueStorage) {
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
      return
    }
    await storage.setItem(
      PENDING_ANALYSIS_REQUESTS_KEY,
      JSON.stringify(requests),
    )
  }

  return {
    getAll,
    async add(request: PendingAnalysisRequest): Promise<void> {
      const existing = await getAll()
      const withoutSameRequest = existing.filter(
        (item) => item.requestId !== request.requestId,
      )
      await writeAll([...withoutSameRequest, request])
    },
    async remove(requestId: string): Promise<void> {
      const existing = await getAll()
      await writeAll(existing.filter((item) => item.requestId !== requestId))
    },
  }
}

export const pendingAnalysisRequests =
  createPendingAnalysisRequestStorage(AsyncStorage)
