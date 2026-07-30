import { useState } from "react"
import { Alert } from "react-native"
import { useQueryClient } from "@tanstack/react-query"
import { bloodMetricsService } from "@/src/services/data/bloodMetricsService"
import { logRecoverableError } from "@/src/lib/errorUtils"
import type {
  BloodGlucoseUpsertRequest,
  BloodPressureUpsertRequest,
} from "@/src/types/bloodMetrics"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { useTranslation } from "react-i18next"

export function useBloodMetricsRecord() {
  const { t } = useTranslation()
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
      logRecoverableError("updateBloodPressure error:", error)
      Alert.alert(
        t("home.errors.saveBloodPressureTitle"),
        t("home.errors.saveBloodPressureBody"),
      )
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
      logRecoverableError("updateBloodGlucose error:", error)
      Alert.alert(
        t("home.errors.saveBloodGlucoseTitle"),
        t("home.errors.saveBloodGlucoseBody"),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return { updateBloodPressure, updateBloodGlucose, isLoading }
}
