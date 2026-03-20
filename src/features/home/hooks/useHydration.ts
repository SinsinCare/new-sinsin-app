import { useState, useCallback } from "react"
import {
  DEFAULT_DAILY_GOAL,
  MAX_WATER_INTAKE,
} from "../data/hydrationConstants"

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
    setIntakeState(Math.max(0, Math.min(amount, MAX_WATER_INTAKE)))
  }, [])

  const addWater = useCallback((amount: number): void => {
    setIntakeState((current) => Math.min(current + amount, MAX_WATER_INTAKE))
  }, [])

  const subtractWater = useCallback((amount: number): void => {
    setIntakeState((current) => Math.max(current - amount, 0))
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
