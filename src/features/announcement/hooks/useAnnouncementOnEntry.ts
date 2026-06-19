import { useCallback, useEffect, useState } from "react"
import { logger } from "@/src/lib/logger"
import { announcementService } from "../services/announcementService"
import { dismissedAnnouncementStorage } from "../storage/dismissedAnnouncements"
import { useAnnouncementSessionStore } from "../state/announcementSessionStore"
import type { AnnouncementNotice } from "../types"

export function useAnnouncementOnEntry(enabled: boolean) {
  const checkedThisSession = useAnnouncementSessionStore(
    (state) => state.checkedThisSession,
  )
  const markChecked = useAnnouncementSessionStore((state) => state.markChecked)
  const resetSession = useAnnouncementSessionStore((state) => state.reset)
  const [activeNotice, setActiveNotice] =
    useState<AnnouncementNotice | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (enabled) return
    resetSession()
    setVisible(false)
    setActiveNotice(null)
  }, [enabled, resetSession])

  useEffect(() => {
    if (!enabled || checkedThisSession) return

    let cancelled = false

    async function loadPopup() {
      try {
        const notice = await announcementService.fetchActivePopup()
        if (cancelled) return
        markChecked()
        if (!notice) return

        const dismissed = await dismissedAnnouncementStorage.has(notice.id)
        if (cancelled || dismissed) return

        setActiveNotice(notice)
        setVisible(true)
      } catch (error) {
        markChecked()
        logger.debug("[announcement] active popup skipped", error)
      }
    }

    loadPopup()

    return () => {
      cancelled = true
    }
  }, [checkedThisSession, enabled, markChecked])

  const close = useCallback(
    async (dismissPermanently: boolean) => {
      const notice = activeNotice
      setVisible(false)
      setActiveNotice(null)

      if (dismissPermanently && notice) {
        await dismissedAnnouncementStorage.add(notice.id)
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
