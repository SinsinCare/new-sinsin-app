import { useRef, useState } from "react"
import { Alert } from "react-native"
import { useRouter } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { foodCameraService } from "@/src/services/data"
import {
  createMealConsultController,
  createSavedMealDeleteController,
} from "../services/mealPersistenceController"
import {
  ensureMealDiary,
  type MealDiaryPersistenceInput,
} from "../services/mealDiaryPersistence"

function confirmDeleteMeal(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      "식단 기록 삭제",
      "이 식단 기록을 삭제하시겠습니까?",
      [
        { text: "취소", style: "cancel", onPress: () => resolve(false) },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    )
  })
}

export function useMealPersistenceActions() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isStartingConsultation, setIsStartingConsultation] = useState(false)
  const [isDeletingDiary, setIsDeletingDiary] = useState(false)
  const routerRef = useRef(router)
  const queryClientRef = useRef(queryClient)
  routerRef.current = router
  queryClientRef.current = queryClient

  const refreshHome = async () => {
    await Promise.all([
      queryClientRef.current.refetchQueries({ queryKey: ["dateAnalysis"] }),
      queryClientRef.current.refetchQueries({ queryKey: ["diaryExistence"] }),
    ])
  }

  const consultControllerRef = useRef<
    ReturnType<typeof createMealConsultController> | undefined
  >(undefined)
  if (!consultControllerRef.current) {
    consultControllerRef.current = createMealConsultController({
      ensureDiary: (input) => ensureMealDiary(foodCameraService, input),
      refreshHome,
      navigate: (navigation) => routerRef.current.push(navigation),
    })
  }

  const deleteControllerRef = useRef<
    ReturnType<typeof createSavedMealDeleteController> | undefined
  >(undefined)
  if (!deleteControllerRef.current) {
    deleteControllerRef.current = createSavedMealDeleteController({
      confirmDelete: confirmDeleteMeal,
      deleteDiary: (diaryId) => foodCameraService.deleteDiary(diaryId),
      refreshHome,
    })
  }

  const startConsultation = async (
    input: MealDiaryPersistenceInput,
  ): Promise<boolean> => {
    setIsStartingConsultation(true)
    try {
      await consultControllerRef.current!.start(input)
      return true
    } catch (error) {
      Alert.alert(
        "식단 저장 실패",
        `${getErrorMessage(error)}\n현재 화면에서 다시 시도해 주세요.`,
      )
      return false
    } finally {
      setIsStartingConsultation(false)
    }
  }

  const deleteSavedMeal = async (diaryId: number): Promise<boolean> => {
    setIsDeletingDiary(true)
    try {
      return await deleteControllerRef.current!.remove(diaryId)
    } catch (error) {
      Alert.alert("삭제 실패", getErrorMessage(error))
      return false
    } finally {
      setIsDeletingDiary(false)
    }
  }

  return {
    startConsultation,
    deleteSavedMeal,
    isStartingConsultation,
    isDeletingDiary,
  }
}
