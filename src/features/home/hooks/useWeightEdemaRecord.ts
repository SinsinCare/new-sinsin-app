import { weightEdemaService } from "@/src/services/data/weightEdemaService"
import { Alert } from "react-native"
import { EdemaLevel } from "../types"

export function useWeightEdemaRecord() {
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

  const updateEdema = async (edemaLevel: EdemaLevel, date: string) => {
    try {
      await weightEdemaService.updateEdema(edemaLevel, date)
    } catch (error) {
      console.error("updateEdema error:", error)
      const message =
        error instanceof Error
          ? error.message
          : "부종 업데이트 중 오류가 발생했습니다."
      Alert.alert("업데이트 실패", message)
    }
  }

  return { updateWeight, updateEdema }
}
