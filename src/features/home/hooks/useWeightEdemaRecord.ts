import { weightEdemaService } from "@/src/services/data/weightEdemaService"
import { useState } from "react"

import { EdemaLevel } from "../types"
import { presentError } from "@/src/lib/errorMessage"
import { useQueryClient } from "@tanstack/react-query"
import { trackAnalyticsEvent } from "@/src/features/analytics"

export function useWeightEdemaRecord() {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

  const updateWeight = async (weightKg: number, date: string) => {
    setIsLoading(true)
    try {
      await weightEdemaService.updateWeight(weightKg, date)
      queryClient.invalidateQueries({ queryKey: ["dateAnalysis", date] })
      // 체중 시트의 7일 추세도 같은 저장을 본다.
      queryClient.invalidateQueries({ queryKey: ["weightRecords"] })
      trackAnalyticsEvent("health_entry_save_succeeded", {})
    } catch (error) {
      trackAnalyticsEvent("health_entry_save_failed", {})
      // upsert 라 같은 값을 다시 보내도 한 건이다 — 재시도가 안전하다.
      presentError(error, {
        scope: "weight-save",
        retry: () => void updateWeight(weightKg, date),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateEdema = async (edemaLevel: EdemaLevel, date: string) => {
    setIsLoading(true)
    try {
      await weightEdemaService.updateEdema(edemaLevel, date)
      queryClient.invalidateQueries({ queryKey: ["dateAnalysis", date] })
      trackAnalyticsEvent("health_entry_save_succeeded", {})
    } catch (error) {
      trackAnalyticsEvent("health_entry_save_failed", {})
      presentError(error, {
        scope: "edema-save",
        retry: () => void updateEdema(edemaLevel, date),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return { updateWeight, updateEdema, isLoading }
}
