import { foodCameraService } from "@/src/services/data"
import { Alert } from "react-native"
import { logRecoverableError } from "@/src/lib/errorUtils"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { useTranslation } from "react-i18next"

export function useExtraWater() {
  const { t } = useTranslation()
  /** 성공 여부를 돌려준다 — 낙관적으로 그린 값을 실패 시 되물릴 수 있게. */
  const updateExtraWater = async (
    date: string,
    deltaWater: number,
  ): Promise<boolean> => {
    try {
      await foodCameraService.updateExtraWater(date, deltaWater)
      trackAnalyticsEvent("health_entry_save_succeeded", {})
      return true
    } catch (error) {
      trackAnalyticsEvent("health_entry_save_failed", {})
      logRecoverableError("updateExtraWater error:", error)
      Alert.alert(
        t("home.errors.saveWaterTitle"),
        t("home.errors.saveWaterBody"),
      )
      return false
    }
  }

  return { updateExtraWater }
}
