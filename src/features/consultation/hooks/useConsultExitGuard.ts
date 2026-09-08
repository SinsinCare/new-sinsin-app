import { useCallback, useEffect, useRef } from "react"
import { Keyboard } from "react-native"
import { useNavigation, usePreventRemove } from "@react-navigation/native"
import { useTranslation } from "react-i18next"
import { showConfirm } from "@/src/lib/dialog"

/** Guard destructive conversation transitions, including native back and swipes. */
export function useConsultExitGuard(options: {
  hasDraft: boolean
  isSending: boolean
  stopGenerating: () => void
  dismissOverlay?: () => void
  restoreDraftFocus?: () => void
}) {
  const navigation = useNavigation()
  const { t } = useTranslation("common")
  const latest = useRef(options)
  latest.current = options
  const pending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const confirmTransition = useCallback(
    async (action: () => unknown | Promise<unknown>) => {
      if (pending.current || !mounted.current) return
      pending.current = true
      try {
        const { hasDraft, isSending } = latest.current
        if (hasDraft || isSending) {
          const restoreKeyboard = hasDraft && Keyboard.isVisible()
          Keyboard.dismiss()
          const discard = await showConfirm({
            title: t(
              isSending
                ? "consult.exit.generatingTitle"
                : "consult.exit.draftTitle",
            ),
            description: t(
              isSending
                ? hasDraft
                  ? "consult.exit.bothBody"
                  : "consult.exit.generatingBody"
                : "consult.exit.draftBody",
            ),
            confirmLabel: t(
              isSending
                ? "consult.exit.stopAndMove"
                : "consult.exit.discardAndMove",
            ),
            cancelLabel: t(
              isSending
                ? "consult.exit.keepWaiting"
                : "consult.exit.keepWriting",
            ),
            destructive: true,
            buttonLayout: "vertical",
          })
          // The dialog resolves after dismissal. Its old callback must not affect a new screen.
          if (!mounted.current) return
          if (!discard) {
            if (
              latest.current.hasDraft &&
              (restoreKeyboard || latest.current.dismissOverlay)
            )
              latest.current.restoreDraftFocus?.()
            return
          }
        }
        if (latest.current.isSending) latest.current.stopGenerating()
        await action()
      } finally {
        pending.current = false
      }
    },
    [t],
  )

  usePreventRemove(
    options.hasDraft || options.isSending || !!options.dismissOverlay,
    ({ data }) => {
      if (latest.current.dismissOverlay) {
        latest.current.dismissOverlay()
        return
      }
      void confirmTransition(() => navigation.dispatch(data.action))
    },
  )
  return confirmTransition
}
