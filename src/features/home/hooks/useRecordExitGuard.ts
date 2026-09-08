import { useEffect, useRef } from "react"
import { useNavigation, usePreventRemove } from "@react-navigation/native"
import { useTranslation } from "react-i18next"

import { showConfirm, type ConfirmOptions } from "@/src/lib/dialog"

/** 헤더·시스템 뒤로가기·스와이프 모두 저장 전 기록을 보호한다. */
export function useRecordExitGuard({
  hasChanges,
  isSaving,
  onBack,
  confirmation,
}: {
  hasChanges: boolean
  isSaving: boolean
  onBack: () => void
  confirmation?: ConfirmOptions
}) {
  const navigation = useNavigation()
  const { t } = useTranslation("common")
  const allowExit = useRef(false)
  const prompting = useRef(false)
  const mounted = useRef(true)
  const saving = useRef(isSaving)
  saving.current = isSaving

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  usePreventRemove(hasChanges || isSaving, async ({ data }) => {
    if (allowExit.current) {
      navigation.dispatch(data.action)
      return
    }
    // 저장 결과가 오기 전에는 이탈·중복 확인창을 열지 않는다.
    if (saving.current || prompting.current) return
    prompting.current = true
    try {
      const discard = await showConfirm({
        title: t("home.recordPage.water.exitTitle"),
        description: t("home.recordPage.water.exitDescription"),
        confirmLabel: t("home.recordPage.water.exitDiscard"),
        cancelLabel: t("home.recordPage.water.exitKeep"),
        destructive: true,
        buttonLayout: "vertical",
        ...confirmation,
      })
      if (!discard || !mounted.current || saving.current) return
      allowExit.current = true
      // showConfirm은 모달이 닫힌 뒤 resolve한다. 막았던 이동을 그대로 이어 간다.
      navigation.dispatch(data.action)
    } finally {
      prompting.current = false
    }
  })

  const leaveConfirmed = () => {
    if (!mounted.current) return
    // 성공 직후에는 아직 hasChanges가 true인 렌더여도 다시 묻지 않는다.
    allowExit.current = true
    onBack()
  }
  return { leaveAfterSave: leaveConfirmed, leaveConfirmed }
}
