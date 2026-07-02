import { useState, useCallback } from "react"
import { clampWaterIntake } from "../utils/waterIntake"

export interface UseHydrationReturn {
  intake: number
  setIntake: (amount: number) => void
  addWater: (amount: number) => void
  subtractWater: (amount: number) => void
  reset: () => void
}

export const useHydration = (): UseHydrationReturn => {
  const [intake, setIntakeState] = useState<number>(0)

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
    setIntake,
    addWater,
    subtractWater,
    reset,
  }
}
