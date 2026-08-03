import { useRef, useState } from "react"

import { useAppRouter } from "@/src/shared/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { presentError } from "@/src/lib/errorMessage"
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

import { showConfirm } from "@/src/lib/dialog"

function confirmDeleteMeal(): Promise<boolean> {
  return showConfirm({
    title: appI18n.t("foodResult.deleteConfirmTitle"),
    description: appI18n.t("foodResult.deleteConfirmBody"),
    confirmLabel: appI18n.t("action.delete"),
    cancelLabel: appI18n.t("action.cancel"),
    destructive: true,
  })
}

export interface MealPersistenceOptions {
  /**
   * 삭제 확인 UI 를 바꿔 끼운다 — FoodAnalysisResult 는 무엇을 지우는지 카드로
   * 미리 보여주는 시트(MealDeleteConfirmSheet)를 쓴다. 없으면 기본 확인창.
   */
  confirmDelete?: () => Promise<boolean>
}

export function useMealPersistenceActions(options?: MealPersistenceOptions) {
  const router = useAppRouter()
  const queryClient = useQueryClient()
  const [isStartingConsultation, setIsStartingConsultation] = useState(false)
  const [isDeletingDiary, setIsDeletingDiary] = useState(false)
  const routerRef = useRef(router)
  const queryClientRef = useRef(queryClient)
  const confirmDeleteRef = useRef(options?.confirmDelete)
  routerRef.current = router
  queryClientRef.current = queryClient
  confirmDeleteRef.current = options?.confirmDelete

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
      confirmDelete: () => (confirmDeleteRef.current ?? confirmDeleteMeal)(),
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
      presentError(error, {
        scope: "meal-consult-start",
        retry: () => void startConsultation(input),
      })
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
      /*
        재시도 핸들러를 주지 않는다. 이 함수의 `true` 를 받은 호출부가 시트를 닫고
        목록을 정리하는데, 토스트 버튼에서 다시 부르면 그 뒷정리가 돌지 않는다 —
        삭제만 되고 화면에는 지운 기록이 남는다. 문구가 원인을 말하고, 다시 지우는 것은
        기록을 다시 눌러서 하면 된다.
      */
      presentError(error, { scope: "meal-diary-delete" })
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
