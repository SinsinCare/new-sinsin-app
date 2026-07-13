import { foodCameraService } from "@/src/services/data/foodCameraService"
import {
  usePendingAnalysisStore,
  type PendingAnalysis,
} from "@/src/stores/pendingAnalysisStore"
import type { FoodAnalysisJob, FoodCameraAnalyzeResult } from "@/src/types"
import { appConfig } from "@/src/config/appConfig"
import { markFoodAnalysisRequestHandled } from "./foodAnalysisRequestState"
import {
  pendingAnalysisRequests,
  type PendingAnalysisRequest,
} from "../storage/pendingAnalysisRequests"

const PENDING_ANALYSIS_TTL_MS = 10 * 60 * 1000

export interface FoodAnalysisRecoveryDeps {
  pendingRequests: {
    getAll: () => Promise<PendingAnalysisRequest[]>
    remove: (requestId: string) => Promise<void>
  }
  fetchByRequestId: (
    requestId: string,
  ) => Promise<FoodCameraAnalyzeResult | null>
  fetchJobByRequestId?: (requestId: string) => Promise<FoodAnalysisJob | null>
  setPending: (pending: PendingAnalysis | null) => void
  setPendingConfirmation?: (pending: {
    job: FoodAnalysisJob
    mealType: PendingAnalysisRequest["mealType"]
    imageUri: string | null
  }) => void
  confirmationEnabled?: boolean
  markHandledRequestId: (requestId: string) => void
  now: () => number
}

const defaultDeps: FoodAnalysisRecoveryDeps = {
  pendingRequests: pendingAnalysisRequests,
  fetchByRequestId: (requestId) =>
    foodCameraService.fetchByRequestId(requestId),
  fetchJobByRequestId: (requestId) =>
    foodCameraService.fetchAnalysisByRequestId(requestId),
  setPending: (pending) =>
    usePendingAnalysisStore.getState().setPending(pending),
  setPendingConfirmation: (pending) =>
    usePendingAnalysisStore.getState().setPendingConfirmation(pending),
  confirmationEnabled: appConfig.foodAnalysisConfirmationEnabled,
  markHandledRequestId: markFoodAnalysisRequestHandled,
  now: Date.now,
}

function resolveRecoveredImageUri(
  result: FoodCameraAnalyzeResult,
  pending: PendingAnalysisRequest,
): string | null {
  return result.imageUrl ?? pending.imageUri
}

export function createFoodAnalysisRecovery(deps: FoodAnalysisRecoveryDeps) {
  async function recoverOne(pending: PendingAnalysisRequest): Promise<boolean> {
    if (deps.now() - pending.startedAt > PENDING_ANALYSIS_TTL_MS) {
      await deps.pendingRequests.remove(pending.requestId)
      return false
    }

    const job = await deps.fetchJobByRequestId?.(pending.requestId)
    if (job?.status === "NEEDS_CONFIRMATION") {
      if (deps.confirmationEnabled) {
        deps.setPendingConfirmation?.({
          job,
          mealType: pending.mealType,
          imageUri: pending.imageUri,
        })
        return true
      }

      // 설문 UI가 꺼진 동안 요청을 지우지 않는다. 다음 앱 진입/포그라운드
      // 전환에서 READY 여부를 다시 확인하고, TTL 이후에만 정리한다.
      return false
    }
    const result =
      job?.status === "READY"
        ? (job.result ?? null)
        : job
          ? null
          : await deps.fetchByRequestId(pending.requestId)
    if (!result) return false

    deps.markHandledRequestId(pending.requestId)
    deps.setPending({
      result,
      mealType: pending.mealType,
      imageUri: resolveRecoveredImageUri(result, pending),
    })
    await deps.pendingRequests.remove(pending.requestId)
    return true
  }

  return {
    async recoverPendingAnalyses(): Promise<void> {
      const pendingList = await deps.pendingRequests.getAll()
      for (const pending of pendingList) {
        try {
          await recoverOne(pending)
        } catch {
          // 복구 실패는 다음 앱 진입/포그라운드 전환에서 다시 시도한다.
        }
      }
    },
    async recoverFoodAnalysisRequest(requestId: string): Promise<void> {
      const pendingList = await deps.pendingRequests.getAll()
      const pending = pendingList.find((item) => item.requestId === requestId)
      if (pending) {
        await recoverOne(pending)
      }
    },
  }
}

export const foodAnalysisRecovery = createFoodAnalysisRecovery(defaultDeps)
