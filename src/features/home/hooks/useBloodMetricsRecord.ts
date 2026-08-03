import { useState } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { bloodMetricsService } from "@/src/services/data/bloodMetricsService"
import { presentError } from "@/src/lib/errorMessage"
import type {
  BloodGlucoseUpsertRequest,
  BloodPressureUpsertRequest,
} from "@/src/types/bloodMetrics"
import { trackAnalyticsEvent } from "@/src/features/analytics"

export function useBloodMetricsRecord() {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

  const updateBloodPressure = async (body: BloodPressureUpsertRequest) => {
    setIsLoading(true)
    try {
      await bloodMetricsService.updateBloodPressure(body)
      queryClient.invalidateQueries({ queryKey: ["dateAnalysis", body.date] })
      trackAnalyticsEvent("health_entry_save_succeeded", {})
    } catch (error) {
      trackAnalyticsEvent("health_entry_save_failed", {})
      // upsert 라 같은 값을 다시 보내도 한 건이다 — 재시도가 안전하다.
      presentError(error, {
        scope: "blood-pressure-save",
        retry: () => void updateBloodPressure(body),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateBloodGlucose = async (body: BloodGlucoseUpsertRequest) => {
    setIsLoading(true)
    try {
      await bloodMetricsService.updateBloodGlucose(body)
      queryClient.invalidateQueries({ queryKey: ["dateAnalysis", body.date] })
      trackAnalyticsEvent("health_entry_save_succeeded", {})
    } catch (error) {
      trackAnalyticsEvent("health_entry_save_failed", {})
      presentError(error, {
        scope: "blood-glucose-save",
        retry: () => void updateBloodGlucose(body),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return { updateBloodPressure, updateBloodGlucose, isLoading }
}
