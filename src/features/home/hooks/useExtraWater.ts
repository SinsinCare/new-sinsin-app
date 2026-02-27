import { foodCameraService } from "@/src/services/data"
import { Alert } from "react-native"

export function useExtraWater() {
  const updateExtraWater = async (date: string, deltaWater: number) => {
    try {
      await foodCameraService.updateExtraWater(date, deltaWater)
    } catch (error) {
      console.error("updateExtraWater error:", error)
      const message =
        error instanceof Error
          ? error.message
          : "수분 섭취량 업데이트 중 오류가 발생했습니다."
      Alert.alert("업데이트 실패", message)
    }
  }

  return { updateExtraWater }
}
