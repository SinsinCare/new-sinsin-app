import { weightEdemaService } from "@/src/services/data/weightEdemaService"
import { Alert } from "react-native"
import { EdemaLevel } from "../types"
import { getErrorMessage } from "@/src/lib/errorUtils"

export function useWeightEdemaRecord() {
  const updateWeight = async (weightKg: number, date: string) => {
    try {
      await weightEdemaService.updateWeight(weightKg, date)
    } catch (error) {
      console.error("updateWeight error:", error)
      Alert.alert("업데이트 실패", getErrorMessage(error))
    }
  }

  const updateEdema = async (edemaLevel: EdemaLevel, date: string) => {
    try {
      await weightEdemaService.updateEdema(edemaLevel, date)
    } catch (error) {
      console.error("updateEdema error:", error)
      Alert.alert("업데이트 실패", getErrorMessage(error))
    }
  }

  return { updateWeight, updateEdema }
}
