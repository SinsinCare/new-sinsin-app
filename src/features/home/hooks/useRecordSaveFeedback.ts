import { useEffect, useRef, useState } from "react"
import { AccessibilityInfo, Keyboard } from "react-native"
import { useTranslation } from "react-i18next"
import { presentError } from "@/src/lib/errorMessage"
import { hapticStepAdvance } from "@/src/lib/haptics"

/** Own the whole request, including history refresh, and only acknowledge a confirmed save. */
export function useRecordSaveFeedback() {
  const { t } = useTranslation("common")
  const lock = useRef(false)
  const mounted = useRef(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isSaving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])
  const reset = () => {
    if (timer.current) clearTimeout(timer.current)
    setSaved(false)
  }
  const run = async (save: () => Promise<boolean>) => {
    if (lock.current) return false
    lock.current = true
    reset()
    setSaving(true)
    Keyboard.dismiss()
    try {
      const ok = await save()
      if (ok && mounted.current) {
        setSaved(true)
        hapticStepAdvance()
        AccessibilityInfo.announceForAccessibility(t("home.recordPage.saved"))
        timer.current = setTimeout(() => {
          if (mounted.current) setSaved(false)
        }, 2200)
      }
      return ok
    } catch (error) {
      if (mounted.current) presentError(error, { scope: "health-record-save" })
      return false
    } finally {
      lock.current = false
      if (mounted.current) setSaving(false)
    }
  }
  return { isSaving, saved, run, reset }
}
