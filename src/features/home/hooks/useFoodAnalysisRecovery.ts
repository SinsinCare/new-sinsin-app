import { useEffect } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { foodAnalysisRecovery } from "../services/foodAnalysisRecovery"

export function useFoodAnalysisRecovery(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return

    foodAnalysisRecovery.recoverPendingAnalyses()

    const handleAppState = (state: AppStateStatus) => {
      if (state === "active") {
        foodAnalysisRecovery.recoverPendingAnalyses()
      }
    }
    const sub = AppState.addEventListener("change", handleAppState)
    return () => sub.remove()
  }, [enabled])
}
