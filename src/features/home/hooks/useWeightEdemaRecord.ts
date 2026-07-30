import { weightEdemaService } from "@/src/services/data/weightEdemaService"
import { useState } from "react"
import { Alert } from "react-native"
import { EdemaLevel } from "../types"
import { logRecoverableError } from "@/src/lib/errorUtils"
import { useQueryClient } from "@tanstack/react-query"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { useTranslation } from "react-i18next"

export function useWeightEdemaRecord() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

  const updateWeight = async (weightKg: number, date: string) => {
    setIsLoading(true)
    try {
      await weightEdemaService.updateWeight(weightKg, date)
      queryClient.invalidateQueries({ queryKey: ["dateAnalysis", date] })
      trackAnalyticsEvent("health_entry_save_succeeded", {})
    } catch (error) {
      trackAnalyticsEvent("health_entry_save_failed", {})
      logRecoverableError("updateWeight error:", error)
      Alert.alert(
        t("home.errors.saveWeightTitle"),
        t("home.errors.saveWeightBody"),
      )
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
      logRecoverableError("updateEdema error:", error)
      Alert.alert(
        t("home.errors.saveEdemaTitle"),
        t("home.errors.saveEdemaBody"),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return { updateWeight, updateEdema, isLoading }
}
