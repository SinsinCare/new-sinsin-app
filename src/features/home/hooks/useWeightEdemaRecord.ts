import { weightEdemaService } from "@/src/services/data/weightEdemaService"
import { useState } from "react"

import { EdemaLevel } from "../types"
import { presentError, toAnalyticsFailKind } from "@/src/lib/errorMessage"
import { useQueryClient } from "@tanstack/react-query"
import { trackAnalyticsEvent } from "@/src/features/analytics"

export function useWeightEdemaRecord() {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

  /** `existing` 은 그날 그 지표에 이미 기록이 있었는가 — 화면이 판정해 넘긴다. */
  const updateWeight = async (
    weightKg: number,
    date: string,
    existing: boolean,
  ) => {
    setIsLoading(true)
    try {
      await weightEdemaService.updateWeight(weightKg, date)
      queryClient.invalidateQueries({ queryKey: ["dateAnalysis", date] })
      // 체중 시트의 7일 추세도 같은 저장을 본다.
      queryClient.invalidateQueries({ queryKey: ["weightRecords"] })
      trackAnalyticsEvent("health_entry_save_succeeded", {
        metric: "weight",
        existing,
      })
    } catch (error) {
      trackAnalyticsEvent("health_entry_save_failed", {
        metric: "weight",
        fail_kind: toAnalyticsFailKind(error),
      })
      // upsert 라 같은 값을 다시 보내도 한 건이다 — 재시도가 안전하다.
      presentError(error, {
        scope: "weight-save",
        retry: () => void updateWeight(weightKg, date, existing),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateEdema = async (
    edemaLevel: EdemaLevel,
    date: string,
    existing: boolean,
  ) => {
    setIsLoading(true)
    try {
      await weightEdemaService.updateEdema(edemaLevel, date)
      queryClient.invalidateQueries({ queryKey: ["dateAnalysis", date] })
      trackAnalyticsEvent("health_entry_save_succeeded", {
        metric: "edema",
        existing,
      })
    } catch (error) {
      trackAnalyticsEvent("health_entry_save_failed", {
        metric: "edema",
        fail_kind: toAnalyticsFailKind(error),
      })
      presentError(error, {
        scope: "edema-save",
        retry: () => void updateEdema(edemaLevel, date, existing),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return { updateWeight, updateEdema, isLoading }
}
