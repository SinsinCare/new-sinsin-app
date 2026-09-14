import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useRecordExitGuard } from "@/src/features/home/hooks/useRecordExitGuard"

import { useGoBack } from "@/src/shared/navigation"

import { FoodAnalysisResult } from "@/src/features/home/components/FoodAnalysisResult"
import { useMealReportPageStore } from "@/src/features/home/stores/mealReportPageStore"

/**
 * 식단 리포트 페이지(2026-09-04 시안). 재료는 여는 쪽이 `mealReportPageStore` 에 두고
 * 온다 — 라우트 파라미터에 분석 결과와 콜백을 실을 수 없어서다(스토어 머리말).
 *
 * 재료 없이 이 주소로 오면(딥링크·재시작) 보여줄 것이 없으므로 바로 되돌아간다.
 */
export default function MealReportRoute() {
  const params = useMealReportPageStore((state) => state.params)
  const { t } = useTranslation("common")
  const [saving, setSaving] = useState(false)
  const closedRef = useRef(false)
  /*
    `router.back()` 을 직접 부르지 않는다 — 스택이 비었을 때 앱 밖으로 나가거나 엉뚱한
    화면에 떨어진다(`tests/navigationBackGuard`). 헬퍼가 폴백까지 함께 처리한다.
  */
  const goBack = useGoBack("/(tabs)/home")

  useEffect(() => {
    if (params === null && !closedRef.current) {
      closedRef.current = true
      goBack()
    }
  }, [goBack, params])

  /*
    X 가 아니라 **제스처·안드로이드 뒤로가기**로 사라질 수도 있다. 그때도 여는 쪽 정리와
    스토어 비우기는 돌아야 한다 — 안 비우면 다음 `openMealReportPage` 가 "이미 열려
    있다" 로 알고 페이지를 안 민다(코드리뷰 2026-09-04 에서 잡음).
  */
  useEffect(
    () => () => {
      if (closedRef.current) return
      closedRef.current = true
      const current = useMealReportPageStore.getState().params
      current?.onClose?.()
      useMealReportPageStore.getState().clear()
    },
    [],
  )

  const unsaved = params !== null && params.showAddButton !== false
  const { leaveAfterSave } = useRecordExitGuard({
    hasChanges: unsaved,
    isSaving: saving || params?.isUpdating === true,
    onBack: goBack,
    confirmation: {
      title: t("foodResult.unsavedTitle"),
      description: t("foodResult.unsavedBody"),
      confirmLabel: t("foodResult.leaveWithoutSaving"),
      cancelLabel: t("foodResult.returnToResult"),
      destructive: true,
      buttonLayout: "vertical",
    },
  })

  if (!params) return null

  return (
    <>
      <FoodAnalysisResult
        source={params.source}
        result={params.result}
        onClose={leaveAfterSave}
        imageUri={params.imageUri}
        mealType={params.mealType}
        onAddToRecord={
          params.onAddToRecord
            ? async () => {
                setSaving(true)
                try {
                  await params.onAddToRecord?.()
                } finally {
                  setSaving(false)
                }
              }
            : undefined
        }
        showAddButton={params.showAddButton}
        isUpdating={params.isUpdating}
        updateFoodAnalysis={params.updateFoodAnalysis}
        diaryId={params.diaryId}
        updateDiaryMealType={params.updateDiaryMealType}
        recordDate={params.recordDate}
        recordedAt={params.recordedAt}
        onDiaryDeleted={params.onDiaryDeleted}
        onResultChange={params.onResultChange}
        onMealTypeChange={params.onMealTypeChange}
      />
    </>
  )
}
