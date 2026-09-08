import { useRef } from "react"
import { Keyboard } from "react-native"
import { useNavigation, usePreventRemove } from "@react-navigation/native"
import { useTranslation } from "react-i18next"
import { showConfirm } from "@/src/lib/dialog"
import { afterModalTransitions } from "@/src/shared/components/appModalGate"

/** Protect the same draft on back gestures and when changing reply/edit targets. */
export function useCommentDraftGuard(hasDraft: boolean) {
  const navigation = useNavigation()
  const { t } = useTranslation("common")
  const confirming = useRef(false)

  const confirmDiscardThen = async (action: () => void) => {
    if (confirming.current) return
    if (!hasDraft) {
      action()
      return
    }
    confirming.current = true
    try {
      Keyboard.dismiss()
      await afterModalTransitions()
      const discard = await showConfirm({
        title: t("community.refresh.discardCommentTitle"),
        description: t("community.refresh.discardCommentBody"),
        confirmLabel: t("community.refresh.discardComment"),
        cancelLabel: t("community.refresh.keepComment"),
        destructive: true,
      })
      if (discard) {
        await afterModalTransitions()
        action()
      }
    } finally {
      confirming.current = false
    }
  }

  usePreventRemove(hasDraft, ({ data }) => {
    void confirmDiscardThen(() => navigation.dispatch(data.action))
  })
  return confirmDiscardThen
}
