import { useEffect } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { useIsFocused } from "@react-navigation/native"
import { foodAnalysisRecovery } from "../services/foodAnalysisRecovery"
import { createFoodAnalysisRecoveryPoller } from "../services/foodAnalysisRecoveryPolling"
import { pendingAnalysisRequests } from "../storage/pendingAnalysisRequests"

export function useFoodAnalysisRecoveryPolling(enabled = true): void {
  const isFocused = useIsFocused()

  useEffect(() => {
    if (!enabled || !isFocused) return

    const poller = createFoodAnalysisRecoveryPoller({
      recover: () => foodAnalysisRecovery.recoverPendingAnalyses(),
    })
    let isActive = AppState.currentState === "active"
    let cancelled = false

    const syncWithPendingRequests = (pendingCount: number) => {
      if (isActive && pendingCount > 0) {
        poller.start()
      } else {
        poller.stop()
      }
    }
    const readAndSyncPendingRequests = async () => {
      const pending = await pendingAnalysisRequests.getAll()
      if (!cancelled) syncWithPendingRequests(pending.length)
    }
    const handleAppState = (state: AppStateStatus) => {
      isActive = state === "active"
      void readAndSyncPendingRequests()
    }

    void readAndSyncPendingRequests()
    const subscription = AppState.addEventListener("change", handleAppState)
    const unsubscribePending = pendingAnalysisRequests.subscribe((pending) => {
      syncWithPendingRequests(pending.length)
    })
    return () => {
      cancelled = true
      subscription.remove()
      unsubscribePending()
      poller.stop()
    }
  }, [enabled, isFocused])
}
