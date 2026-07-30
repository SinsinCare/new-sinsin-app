import { useCallback, useEffect, useRef, useState } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { useIsFocused } from "@react-navigation/native"
import { useTranslation } from "react-i18next"
import { logger } from "@/src/lib/logger"
import { normalizeLanguage } from "@/src/i18n"
import { announcementService } from "../services/announcementService"
import { dismissedAnnouncementStorage } from "../storage/dismissedAnnouncements"
import { useAnnouncementSessionStore } from "../state/announcementSessionStore"
import type { AnnouncementNotice } from "../types"
import { createAnnouncementEntryController } from "./announcementEntryController"

export function useAnnouncementOnEntry(enabled: boolean) {
  const isFocused = useIsFocused()
  const { i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
  const resetSession = useAnnouncementSessionStore((state) => state.reset)
  const [activeNotice, setActiveNotice] = useState<AnnouncementNotice | null>(
    null,
  )
  const [visible, setVisible] = useState(false)
  const lifecycleRef = useRef({ enabled, isFocused })
  lifecycleRef.current = { enabled, isFocused }
  const previousLanguageRef = useRef(language)
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
    if (previousLanguageRef.current === language) return
    previousLanguageRef.current = language
    // 같은 로그인 세션이어도 언어별 공지 payload는 별개다. 이전 언어의
    // 완료 표시와 화면 상태를 지우고, 진행 중 요청도 무효화한다.
    controllerRef.current?.invalidate()
    resetSession()
    setVisible(false)
    setActiveNotice(null)
  }, [language, resetSession])

  useEffect(() => {
    triggerCheck()
  }, [enabled, isFocused, language, triggerCheck])

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
