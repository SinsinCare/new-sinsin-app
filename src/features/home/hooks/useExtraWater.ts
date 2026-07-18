import { foodCameraService } from "@/src/services/data"
import { Alert } from "react-native"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { trackAnalyticsEvent } from "@/src/features/analytics"

export function useExtraWater() {
  const updateExtraWater = async (date: string, deltaWater: number) => {
    try {
      await foodCameraService.updateExtraWater(date, deltaWater)
      trackAnalyticsEvent("health_entry_save_succeeded", {})
    } catch (error) {
      trackAnalyticsEvent("health_entry_save_failed", {})
      console.error("updateExtraWater error:", error)
      Alert.alert("업데이트 실패", getErrorMessage(error))
    }
  }

  return { updateExtraWater }
}
