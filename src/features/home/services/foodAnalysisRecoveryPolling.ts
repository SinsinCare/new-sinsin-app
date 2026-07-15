import type { FoodAnalysisRecoveryResult } from "./foodAnalysisRecovery"

export const FOOD_ANALYSIS_RECOVERY_POLL_INTERVAL_MS = 5000

interface FoodAnalysisRecoveryPollerDeps {
  recover: () => Promise<FoodAnalysisRecoveryResult>
  intervalMs?: number
  schedule?: (
    callback: () => void,
    delayMs: number,
  ) => ReturnType<typeof setTimeout>
  cancel?: (timer: ReturnType<typeof setTimeout>) => void
}

export function createFoodAnalysisRecoveryPoller({
  recover,
  intervalMs = FOOD_ANALYSIS_RECOVERY_POLL_INTERVAL_MS,
  schedule = setTimeout,
  cancel = clearTimeout,
}: FoodAnalysisRecoveryPollerDeps) {
  let active = false
  let generation = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  const clearScheduledRecovery = () => {
    if (timer === null) return
    cancel(timer)
    timer = null
  }

  const run = async (runGeneration: number) => {
    if (!active || generation !== runGeneration) return

    let shouldRetry = false
    try {
      const result = await recover()
      shouldRetry = result.remainingCount > 0
    } catch {
      shouldRetry = true
    }

    if (!active || generation !== runGeneration) return
    if (!shouldRetry) {
      active = false
      return
    }
    timer = schedule(() => {
      timer = null
      void run(runGeneration)
    }, intervalMs)
  }

  return {
    start() {
      if (active) return
      active = true
      generation += 1
      void run(generation)
    },
    stop() {
      if (!active && timer === null) return
      active = false
      generation += 1
      clearScheduledRecovery()
    },
  }
}
