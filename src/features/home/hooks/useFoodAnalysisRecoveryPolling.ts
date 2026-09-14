import { useEffect } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { useIsFocused } from "@react-navigation/native"
import { foodAnalysisRecovery } from "../services/foodAnalysisRecovery"
import { createFoodAnalysisRecoveryPoller } from "../services/foodAnalysisRecoveryPolling"
import {
  isForegroundFoodAnalysisRequest,
  subscribeForegroundFoodAnalysisRequests,
} from "../services/foodAnalysisRequestState"
import {
  pendingAnalysisRequests,
  type PendingAnalysisRequest,
} from "../storage/pendingAnalysisRequests"

export function useFoodAnalysisRecoveryPolling(enabled = true): void {
  const isFocused = useIsFocused()

  useEffect(() => {
    if (!enabled || !isFocused) return

    const poller = createFoodAnalysisRecoveryPoller({
      recover: () => foodAnalysisRecovery.recoverPendingAnalyses(),
    })
    let isActive = AppState.currentState === "active"
    let cancelled = false
    /*
      폴러를 돌릴지는 **복구가 맡을 대기**가 있는가로 정한다. 포그라운드 훅이 직접 폴링
      중인 요청은 저장소에도 적혀 있지만 복구가 건너뛰므로(`runRecovery` 첫 분기), 그것만
      있을 때 폴러를 돌리면 5초마다 저장소를 읽고 아무것도 안 하는 헛돌기다.
    */
    let latestPending: PendingAnalysisRequest[] = []

    const syncWithPendingRequests = (pending: PendingAnalysisRequest[]) => {
      latestPending = pending
      const recoverable = pending.filter(
        (item) => !isForegroundFoodAnalysisRequest(item.requestId),
      ).length
      if (isActive && recoverable > 0) {
        poller.start()
      } else {
        poller.stop()
      }
    }
    const readAndSyncPendingRequests = async () => {
      const pending = await pendingAnalysisRequests.getAll()
      if (!cancelled) syncWithPendingRequests(pending)
    }
    const handleAppState = (state: AppStateStatus) => {
      isActive = state === "active"
      void readAndSyncPendingRequests()
    }

    void readAndSyncPendingRequests()
    const subscription = AppState.addEventListener("change", handleAppState)
    const unsubscribePending = pendingAnalysisRequests.subscribe((pending) => {
      syncWithPendingRequests(pending)
    })
    // 포그라운드가 요청을 놓는 순간(X 로 나감 등)은 저장소 쓰기가 없다 — 이 구독이 폴러를 깨운다.
    const unsubscribeForeground = subscribeForegroundFoodAnalysisRequests(
      () => {
        if (!cancelled) syncWithPendingRequests(latestPending)
      },
    )
    return () => {
      cancelled = true
      subscription.remove()
      unsubscribePending()
      unsubscribeForeground()
      poller.stop()
    }
  }, [enabled, isFocused])
}
