import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { useHydration } from "./useHydration"
import { useExtraWater } from "./useExtraWater"
import { EdemaLevel } from "../data/EdemaConstants"
import { toDateStr } from "@/src/features/home/utils/dateUtils"
import { useQueryClient } from "@tanstack/react-query"
import { debounce } from "lodash-es"

const DEBOUNCE_MS = 500

export interface UseHomeRecordReturn {
  // Hydration
  intake: number
  dailyGoal: number
  percentage: number
  remaining: number
  isGoalAchieved: boolean
  addWater: (amount: number) => void
  subtractWater: (amount: number) => void
  resetHydration: (serverExtraWater: number) => void
  syncFromServer: (serverExtraWater: number) => void

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
  const queryClient = useQueryClient()

  const [weight, setWeight] = useState("")
  const [edemaLevel, setEdemaLevel] = useState<EdemaLevel | null>(null)

  // TODO: Firestore 연동 시 날짜별 어제 체중 조회로 교체
  const yesterdayWeight: number | null = 60.4

  const dateStr = toDateStr(selectedDate)

  // Debounce state for water intake
  const pendingDeltaRef = useRef(0)

  const flushPendingWater = useMemo(
    () =>
      debounce((flushDateStr: string) => {
        const delta = pendingDeltaRef.current
        if (delta === 0) return
        pendingDeltaRef.current = 0
        updateExtraWater(flushDateStr, delta).then(() => {
          queryClient.refetchQueries({
            queryKey: ["dateAnalysis", flushDateStr],
          })
        })
      }, DEBOUNCE_MS),
    [updateExtraWater, queryClient],
  )

  // Cancel debounce on unmount or date change
  useEffect(() => {
    return () => {
      flushPendingWater.cancel()
    }
  }, [flushPendingWater, dateStr])

  const addWaterWithApi = useCallback(
    (amount: number) => {
      // Optimistic: update local state immediately
      hydration.addWater(amount)

      // Accumulate delta and schedule debounced flush
      pendingDeltaRef.current += amount
      flushPendingWater(dateStr)
    },
    [hydration, dateStr, flushPendingWater],
  )

  const syncFromServer = useCallback(
    (serverExtraWater: number) => {
      hydration.setIntake(serverExtraWater)
      pendingDeltaRef.current = 0
    },
    [hydration],
  )

  const resetWithApi = useCallback(
    (serverExtraWater: number) => {
      // Cancel pending debounce
      flushPendingWater.cancel()
      pendingDeltaRef.current = 0

      // Optimistic: reset local state immediately
      hydration.reset()

      // API call + refetch current date only
      updateExtraWater(dateStr, -serverExtraWater).then(() => {
        queryClient.refetchQueries({
          queryKey: ["dateAnalysis", dateStr],
        })
      })
    },
    [hydration, dateStr, updateExtraWater, queryClient, flushPendingWater],
  )

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
    syncFromServer,
    weight,
    setWeight,
    yesterdayWeight,

    // Edema
    edemaLevel,
    setEdemaLevel: handleSetEdemaLevel,
  }
}
