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

export interface FoodAnalysisRecoveryResult {
  recoveredCount: number
  remainingCount: number
  /**
   * TTL(10분)을 넘겨 **결과를 보여 주지도 못하고 버린** 건수. 사용자 쪽에서는
   * "분석하다 말았는데 아무 일도 안 일어났다" 이고, 지금까지 이 손실은 어디에도
   * 남지 않았다(설계 §9-④). 세는 곳은 아래 `runRecovery` 의 첫 분기 하나뿐이다.
   */
  expiredCount: number
}

/**
 * 대기 하나를 훑은 결과. 종전에는 `boolean` 이라 "못 살렸다" 안에 **폐기**와
 * **아직 진행 중**이 섞여 있었다 — 그 둘은 정반대의 사건이다.
 */
type RecoveryOutcome = "recovered" | "expired" | "pending"

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
  const inFlightRequests = new Map<string, Promise<RecoveryOutcome>>()

  async function runRecovery(
    pending: PendingAnalysisRequest,
  ): Promise<RecoveryOutcome> {
    if (deps.now() - pending.startedAt > PENDING_ANALYSIS_TTL_MS) {
      await deps.pendingRequests.remove(pending.requestId)
      return "expired"
    }

    const job = await deps.fetchJobByRequestId?.(pending.requestId)
    if (job?.status === "NEEDS_CONFIRMATION") {
      if (deps.confirmationEnabled) {
        deps.setPendingConfirmation?.({
          job,
          mealType: pending.mealType,
          imageUri: pending.imageUri,
        })
        return "recovered"
      }

      // 확인 UI가 없는 빌드에서는 사용자가 이 상태를 끝낼 수 없다. 진행 중인
      // 것처럼 보존하지 않고 실패한 미완료 요청을 정리한다.
      deps.markHandledRequestId(pending.requestId)
      await deps.pendingRequests.remove(pending.requestId)
      return "pending"
    }
    const result =
      job?.status === "READY"
        ? (job.result ?? null)
        : job
          ? null
          : await deps.fetchByRequestId(pending.requestId)
    if (!result) return "pending"

    deps.markHandledRequestId(pending.requestId)
    deps.setPending({
      result,
      mealType: pending.mealType,
      imageUri: resolveRecoveredImageUri(result, pending),
    })
    await deps.pendingRequests.remove(pending.requestId)
    return "recovered"
  }

  function recoverOne(
    pending: PendingAnalysisRequest,
  ): Promise<RecoveryOutcome> {
    const existing = inFlightRequests.get(pending.requestId)
    if (existing) return existing

    const recovery = runRecovery(pending).finally(() => {
      if (inFlightRequests.get(pending.requestId) === recovery) {
        inFlightRequests.delete(pending.requestId)
      }
    })
    inFlightRequests.set(pending.requestId, recovery)
    return recovery
  }

  return {
    async recoverPendingAnalyses(): Promise<FoodAnalysisRecoveryResult> {
      const pendingList = await deps.pendingRequests.getAll()
      let recoveredCount = 0
      let expiredCount = 0
      for (const pending of pendingList) {
        try {
          const outcome = await recoverOne(pending)
          if (outcome === "recovered") recoveredCount += 1
          else if (outcome === "expired") expiredCount += 1
        } catch {
          // 복구 실패는 다음 앱 진입/포그라운드 전환에서 다시 시도한다.
        }
      }
      const remaining = await deps.pendingRequests.getAll()
      return { recoveredCount, expiredCount, remainingCount: remaining.length }
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
