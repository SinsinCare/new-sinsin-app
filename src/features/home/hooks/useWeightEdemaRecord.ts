import { weightEdemaService } from "@/src/services/data/weightEdemaService"
import { useState } from "react"
import { Alert } from "react-native"
import { EdemaLevel } from "../types"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { useQueryClient } from "@tanstack/react-query"

export function useWeightEdemaRecord() {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

  const updateWeight = async (weightKg: number, date: string) => {
    setIsLoading(true)
    try {
      await weightEdemaService.updateWeight(weightKg, date)
      queryClient.invalidateQueries({ queryKey: ["dateAnalysis", date] })
    } catch (error) {
      console.error("updateWeight error:", error)
      Alert.alert("업데이트 실패", getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  const updateEdema = async (edemaLevel: EdemaLevel, date: string) => {
    setIsLoading(true)
    try {
      await weightEdemaService.updateEdema(edemaLevel, date)
      queryClient.invalidateQueries({ queryKey: ["dateAnalysis", date] })
    } catch (error) {
      console.error("updateEdema error:", error)
      Alert.alert("업데이트 실패", getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  return { updateWeight, updateEdema, isLoading }
}
