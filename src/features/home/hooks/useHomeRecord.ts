import { useState, useCallback } from "react"
import { useHydration } from "./useHydration"
import { useExtraWater } from "./useExtraWater"
import { EdemaLevel } from "../data/EdemaConstants"
import { toDateStr } from "@/src/utils/dateUtils"

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

export const useHomeRecord = (selectedDate: Date): UseHomeRecordReturn => {
  const hydration = useHydration()
  const { updateExtraWater } = useExtraWater()

  const [weight, setWeight] = useState("")
  const [edemaLevel, setEdemaLevel] = useState<EdemaLevel | null>(null)

  // TODO: Firestore 연동 시 날짜별 어제 체중 조회로 교체
  const yesterdayWeight: number | null = 60.4

  const dateStr = toDateStr(selectedDate)

  const addWaterWithApi = useCallback(
    async (amount: number) => {
      hydration.addWater(amount)
      await updateExtraWater(dateStr, amount)
    },
    [hydration, dateStr, updateExtraWater],
  )

  const resetWithApi = useCallback(async () => {
    const currentIntake = hydration.intake
    hydration.reset()
    await updateExtraWater(dateStr, -currentIntake)
  }, [hydration, dateStr, updateExtraWater])

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
    addWater: addWaterWithApi,
    subtractWater: hydration.subtractWater,
    resetHydration: resetWithApi,

    // Weight
    weight,
    setWeight,
    yesterdayWeight,

    // Edema
    edemaLevel,
    setEdemaLevel: handleSetEdemaLevel,
  }
}
