import { useState, useCallback } from "react"
import { useHydration } from "./useHydration"
import { EdemaLevel } from "../data/EdemaConstants"

export interface UseHomeRecordReturn {
  // Hydration
  intake: number
  dailyGoal: number
  percentage: number
  remaining: number
  isGoalAchieved: boolean
  addWater: (amount: number) => void
  subtractWater: (amount: number) => void
  resetHydration: () => void

  // Weight
  weight: string
  setWeight: (value: string) => void
  yesterdayWeight: number | null

  // Edema
  edemaLevel: EdemaLevel | null
  setEdemaLevel: (level: EdemaLevel) => void
}

export const useHomeRecord = (): UseHomeRecordReturn => {
  const hydration = useHydration()

  const [weight, setWeight] = useState("")
  const [edemaLevel, setEdemaLevel] = useState<EdemaLevel | null>(null)

  // TODO: Firestore 연동 시 날짜별 어제 체중 조회로 교체
  const yesterdayWeight: number | null = 60.4

  const handleSetEdemaLevel = useCallback((level: EdemaLevel) => {
    setEdemaLevel(level)
  }, [])

  return {
    // Hydration
    intake: hydration.intake,
    dailyGoal: hydration.dailyGoal,
    percentage: hydration.percentage,
    remaining: hydration.remaining,
    isGoalAchieved: hydration.isGoalAchieved,
    addWater: hydration.addWater,
    subtractWater: hydration.subtractWater,
    resetHydration: hydration.reset,

    // Weight
    weight,
    setWeight,
    yesterdayWeight,

    // Edema
    edemaLevel,
    setEdemaLevel: handleSetEdemaLevel,
  }
}
