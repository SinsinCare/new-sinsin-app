import { weightEdemaService } from "@/src/services/data/weightEdemaService"
import { Alert } from "react-native"

export function useWeightRecord() {
  const updateWeight = async (weightKg: number, date: string) => {
    try {
      await weightEdemaService.updateWeight(weightKg, date)
    } catch (error) {
      console.error("updateWeight error:", error)
      const message =
        error instanceof Error
          ? error.message
          : "체중 업데이트 중 오류가 발생했습니다."
      Alert.alert("업데이트 실패", message)
    }
  }

  return { updateWeight }
}
