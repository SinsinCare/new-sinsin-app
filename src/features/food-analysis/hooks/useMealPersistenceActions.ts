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
import appI18n from "@/src/i18n"

function confirmDeleteMeal(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      appI18n.t("foodResult.deleteConfirmTitle"),
      appI18n.t("foodResult.deleteConfirmBody"),
      [
        {
          text: appI18n.t("action.cancel"),
          style: "cancel",
          onPress: () => resolve(false),
        },
        {
          text: appI18n.t("action.delete"),
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
        appI18n.t("home.errors.saveMealTitle"),
        getErrorMessage(error, appI18n.t("home.errors.saveMealBody")),
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
      Alert.alert(
        appI18n.t("foodResult.deleteFailedTitle"),
        getErrorMessage(error, appI18n.t("foodResult.deleteFailedBody")),
      )
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
