import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { useHydration } from "./useHydration"
import { useExtraWater } from "./useExtraWater"
import { EdemaLevel } from "../data/EdemaConstants"
import { toDateStr } from "@/src/features/home/utils/dateUtils"
import { useQueryClient } from "@tanstack/react-query"
import { debounce } from "lodash-es"
import { clampWaterIntake, getAppliedWaterDelta } from "../utils/waterIntake"

const DEBOUNCE_MS = 500

export interface UseHomeRecordReturn {
  // Hydration
  intake: number
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

  const yesterdayWeight: number | null = null

  const dateStr = toDateStr(selectedDate)

  // Debounce state for water intake
  const pendingDeltaRef = useRef(0)
  const intakeRef = useRef(hydration.intake)
  const updateExtraWaterRef = useRef(updateExtraWater)
  updateExtraWaterRef.current = updateExtraWater

  useEffect(() => {
    intakeRef.current = hydration.intake
  }, [hydration.intake])

  const savePendingWater = useCallback(
    (flushDateStr: string) => {
      const delta = pendingDeltaRef.current
      if (delta === 0) return
      pendingDeltaRef.current = 0
      updateExtraWaterRef
        .current(flushDateStr, delta)
        .then(() => {
          queryClient.refetchQueries({
            queryKey: ["dateAnalysis", flushDateStr],
          })
        })
        .catch((error) => {
          console.error("updateExtraWater error:", error)
        })
    },
    [queryClient],
  )

  const flushPendingWater = useMemo(
    () => debounce(savePendingWater, DEBOUNCE_MS),
    [savePendingWater],
  )

  const flushPendingWaterNow = useCallback(
    (flushDateStr: string) => {
      flushPendingWater.cancel()
      savePendingWater(flushDateStr)
    },
    [flushPendingWater, savePendingWater],
  )

  // Reset hydration when date changes
  const { setIntake: setHydrationIntake } = hydration
  useEffect(() => {
    intakeRef.current = 0
    setHydrationIntake(0)
  }, [dateStr, setHydrationIntake])

  // Flush pending water for the date that is being left.
  useEffect(() => {
    return () => {
      flushPendingWaterNow(dateStr)
    }
  }, [dateStr, flushPendingWaterNow])

  const addWaterWithApi = useCallback(
    (amount: number) => {
      const applied = getAppliedWaterDelta(intakeRef.current, amount)
      if (applied <= 0) return

      intakeRef.current = clampWaterIntake(intakeRef.current + applied)
      hydration.addWater(applied)
      pendingDeltaRef.current += applied
      flushPendingWater(dateStr)
    },
    [hydration, dateStr, flushPendingWater],
  )

  const subtractWaterWithApi = useCallback(
    (amount: number) => {
      const applied = getAppliedWaterDelta(intakeRef.current, -amount)
      if (applied >= 0) return

      intakeRef.current = clampWaterIntake(intakeRef.current + applied)
      hydration.subtractWater(Math.abs(applied))
      pendingDeltaRef.current += applied
      flushPendingWater(dateStr)
    },
    [hydration, dateStr, flushPendingWater],
  )

  const syncFromServer = useCallback(
    (serverExtraWater: number) => {
      // 아직 안 보낸 pending이 있으면 optimistic 상태 유지 (덮어쓰지 않음)
      if (pendingDeltaRef.current !== 0) return
      intakeRef.current = clampWaterIntake(serverExtraWater)
      hydration.setIntake(serverExtraWater)
    },
    [hydration],
  )

  const resetWithApi = useCallback(
    (serverExtraWater: number) => {
      // Cancel pending debounce
      flushPendingWater.cancel()
      pendingDeltaRef.current = 0
      intakeRef.current = 0

      // Optimistic: reset local state immediately
      hydration.reset()

      // API call + refetch current date only
      updateExtraWater(dateStr, -serverExtraWater)
        .then(() => {
          queryClient.refetchQueries({
            queryKey: ["dateAnalysis", dateStr],
          })
        })
        .catch((error) => {
          console.error("resetExtraWater error:", error)
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
    addWater: addWaterWithApi,
    subtractWater: subtractWaterWithApi,
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
