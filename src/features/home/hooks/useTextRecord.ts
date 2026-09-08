import { useEffect, useRef, useState } from "react"
import { Keyboard } from "react-native"
import { useTranslation } from "react-i18next"
import { showConfirm } from "@/src/lib/dialog"
import { presentError } from "@/src/lib/errorMessage"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import type { AnalyticsMealSlot } from "@/src/features/analytics/events"

export interface TextRecordOptions {
  open: boolean
  slot: AnalyticsMealSlot
  onClose: () => void
  onSubmit: (text: string) => void | Promise<void>
}

export function useTextRecord({
  open,
  slot,
  onClose,
  onSubmit,
}: TextRecordOptions) {
  const { t } = useTranslation()
  const [text, setText] = useState("")
  const [isSubmitting, setSubmitting] = useState(false)
  const openedRef = useRef(false)
  const session = useRef(0)
  const submitting = useRef(false)
  const closing = useRef(false)
  const mounted = useRef(true)
  const latest = useRef({ open, onClose })
  latest.current = { open, onClose }
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    if (!open) {
      session.current += 1
      setText("")
      setSubmitting(false)
      openedRef.current = false
      submitting.current = false
      closing.current = false
      return
    }
    if (openedRef.current) return
    openedRef.current = true
    trackAnalyticsEvent("food_text_record_viewed", { slot })
  }, [open, slot])

  const close = async () => {
    if (submitting.current || closing.current) return
    const currentSession = session.current
    closing.current = true
    try {
      const filled = text.trim().length > 0
      if (
        filled &&
        !(await showConfirm({
          title: t("home.textRecord.discardTitle"),
          description: t("home.textRecord.discardBody"),
          confirmLabel: t("home.textRecord.discard"),
          cancelLabel: t("home.textRecord.keepWriting"),
          destructive: true,
          buttonLayout: "vertical",
        }))
      )
        return
      if (
        !mounted.current ||
        !latest.current.open ||
        currentSession !== session.current
      )
        return
      Keyboard.dismiss()
      trackAnalyticsEvent("food_text_record_discarded", { filled })
      latest.current.onClose()
    } finally {
      if (currentSession === session.current) closing.current = false
    }
  }

  const submit = async () => {
    const value = text.trim()
    if (!value || submitting.current || closing.current) return
    const currentSession = session.current
    submitting.current = true
    setSubmitting(true)
    Keyboard.dismiss()
    try {
      await onSubmit(value)
    } catch (error) {
      if (mounted.current && currentSession === session.current)
        presentError(error, { scope: "food-text-record" })
    } finally {
      if (currentSession === session.current) {
        submitting.current = false
        if (mounted.current) setSubmitting(false)
      }
    }
  }
  return {
    text,
    setText,
    isSubmitting,
    canSubmit: text.trim().length > 0,
    close,
    submit,
  }
}
