import { useCallback, useEffect, useRef, useState } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { useIsFocused } from "@react-navigation/native"
import { logger } from "@/src/lib/logger"
import { announcementService } from "../services/announcementService"
import { dismissedAnnouncementStorage } from "../storage/dismissedAnnouncements"
import { useAnnouncementSessionStore } from "../state/announcementSessionStore"
import type { AnnouncementNotice } from "../types"
import { createAnnouncementEntryController } from "./announcementEntryController"

export function useAnnouncementOnEntry(enabled: boolean) {
  const isFocused = useIsFocused()
  const resetSession = useAnnouncementSessionStore((state) => state.reset)
  const [activeNotice, setActiveNotice] = useState<AnnouncementNotice | null>(
    null,
  )
  const [visible, setVisible] = useState(false)
  const lifecycleRef = useRef({ enabled, isFocused })
  lifecycleRef.current = { enabled, isFocused }
  const controllerRef = useRef<ReturnType<
    typeof createAnnouncementEntryController
  > | null>(null)

  if (!controllerRef.current) {
    controllerRef.current = createAnnouncementEntryController({
      fetchActivePopup: () => announcementService.fetchActivePopup(),
      isDismissed: (notice) => dismissedAnnouncementStorage.has(notice),
      getSession: () => useAnnouncementSessionStore.getState(),
      recordAttempt: () =>
        useAnnouncementSessionStore.getState().recordAttempt(),
      markChecked: () => useAnnouncementSessionStore.getState().markChecked(),
      showNotice: (notice) => {
        setActiveNotice(notice)
        setVisible(true)
      },
      onError: (error) =>
        logger.debug("[announcement] active popup check failed", error),
    })
  }

  const triggerCheck = useCallback(() => {
    const lifecycle = lifecycleRef.current
    if (
      !lifecycle.enabled ||
      !lifecycle.isFocused ||
      AppState.currentState !== "active"
    ) {
      return
    }
    void controllerRef.current?.check()
  }, [])

  useEffect(() => {
    if (enabled) return
    controllerRef.current?.invalidate()
    resetSession()
    setVisible(false)
    setActiveNotice(null)
  }, [enabled, resetSession])

  useEffect(() => {
    triggerCheck()
  }, [enabled, isFocused, triggerCheck])

  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === "active") triggerCheck()
    }
    const subscription = AppState.addEventListener("change", handleAppState)
    return () => subscription.remove()
  }, [triggerCheck])

  useEffect(
    () => () => {
      controllerRef.current?.invalidate()
    },
    [],
  )

  const close = useCallback(
    async (dismissPermanently: boolean) => {
      const notice = activeNotice
      setVisible(false)
      setActiveNotice(null)

      if (dismissPermanently && notice) {
        await dismissedAnnouncementStorage.add(notice)
      }
    },
    [activeNotice],
  )

  return {
    activeNotice,
    visible,
    close,
  }
}
