import { useState, useCallback } from "react"
import { DEFAULT_DAILY_GOAL } from "../data/hydrationConstants"
import { clampWaterIntake } from "../utils/waterIntake"

export interface UseHydrationReturn {
  intake: number
  dailyGoal: number
  percentage: number
  remaining: number
  isGoalAchieved: boolean
  setIntake: (amount: number) => void
  addWater: (amount: number) => void
  subtractWater: (amount: number) => void
  reset: () => void
}

export const useHydration = (
  initialGoal: number = DEFAULT_DAILY_GOAL,
): UseHydrationReturn => {
  const [intake, setIntakeState] = useState<number>(0)
  const [dailyGoal] = useState<number>(initialGoal)

  const percentage = Math.min((intake / dailyGoal) * 100, 100)
  const remaining = Math.max(dailyGoal - intake, 0)
  const isGoalAchieved = percentage >= 100

  const setIntake = useCallback((amount: number): void => {
    setIntakeState(clampWaterIntake(amount))
  }, [])

  const addWater = useCallback((amount: number): void => {
    setIntakeState((current) => clampWaterIntake(current + amount))
  }, [])

  const subtractWater = useCallback((amount: number): void => {
    setIntakeState((current) => clampWaterIntake(current - amount))
  }, [])

  const reset = useCallback((): void => {
    setIntakeState(0)
  }, [])

  return {
    intake,
    dailyGoal,
    percentage,
    remaining,
    isGoalAchieved,
    setIntake,
    addWater,
    subtractWater,
    reset,
  }
}
