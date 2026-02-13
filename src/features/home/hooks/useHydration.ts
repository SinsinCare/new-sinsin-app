import { useState, useCallback } from "react"
import { DEFAULT_DAILY_GOAL } from "../data/hydrationConstants"

export interface UseHydrationReturn {
  intake: number
  dailyGoal: number
  percentage: number
  remaining: number
  isGoalAchieved: boolean
  addWater: (amount: number) => void
  subtractWater: (amount: number) => void
  reset: () => void
}

export const useHydration = (
  initialGoal: number = DEFAULT_DAILY_GOAL,
): UseHydrationReturn => {
  const [intake, setIntake] = useState<number>(0)
  const [dailyGoal] = useState<number>(initialGoal)

  const percentage = Math.min((intake / dailyGoal) * 100, 100)
  const remaining = Math.max(dailyGoal - intake, 0)
  const isGoalAchieved = percentage >= 100

  const addWater = useCallback(
    (amount: number): void => {
      setIntake((current) => Math.min(current + amount, dailyGoal))
    },
    [dailyGoal],
  )

  const subtractWater = useCallback((amount: number): void => {
    setIntake((current) => Math.max(current - amount, 0))
  }, [])

  const reset = useCallback((): void => {
    setIntake(0)
  }, [])

  return {
    intake,
    dailyGoal,
    percentage,
    remaining,
    isGoalAchieved,
    addWater,
    subtractWater,
    reset,
  }
}
