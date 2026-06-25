import { useState } from "react"
import { Alert } from "react-native"
import { useQueryClient } from "@tanstack/react-query"
import { bloodMetricsService } from "@/src/services/data/bloodMetricsService"
import { getErrorMessage } from "@/src/lib/errorUtils"
import type {
  BloodGlucoseUpsertRequest,
  BloodPressureUpsertRequest,
} from "@/src/types/bloodMetrics"

export function useBloodMetricsRecord() {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

  const updateBloodPressure = async (body: BloodPressureUpsertRequest) => {
    setIsLoading(true)
    try {
      await bloodMetricsService.updateBloodPressure(body)
      queryClient.invalidateQueries({ queryKey: ["dateAnalysis", body.date] })
    } catch (error) {
      console.error("updateBloodPressure error:", error)
      Alert.alert("업데이트 실패", getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  const updateBloodGlucose = async (body: BloodGlucoseUpsertRequest) => {
    setIsLoading(true)
    try {
      await bloodMetricsService.updateBloodGlucose(body)
      queryClient.invalidateQueries({ queryKey: ["dateAnalysis", body.date] })
    } catch (error) {
      console.error("updateBloodGlucose error:", error)
      Alert.alert("업데이트 실패", getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  return { updateBloodPressure, updateBloodGlucose, isLoading }
}
