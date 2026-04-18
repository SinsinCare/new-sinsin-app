import { useState, useEffect, useCallback } from "react"
import { AppState, AppStateStatus } from "react-native"
import { notificationService } from "@/src/services/notificationService"
import { notificationSettingsService } from "@/src/services/data/notificationSettingsService"
import type { NotificationSettings } from "@/src/types/notification"
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/src/types/notification"

export function useNotifications(isAuthenticated: boolean) {
  const [settings, setSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS,
  )

  const syncFromServer = useCallback(async () => {
    if (!isAuthenticated) return
    const fetched = await notificationSettingsService.get()
    setSettings(fetched)
    await notificationService.scheduleAll(fetched)
  }, [isAuthenticated])

  // 로그인 시 서버 설정 fetch → 스케줄 등록
  useEffect(() => {
    if (isAuthenticated) {
      syncFromServer()
    } else {
      notificationService.cancelAll()
    }
  }, [isAuthenticated, syncFromServer])

  // 포그라운드 복귀 시 서버 설정 재동기화 (서버에서 주기 변경 반영)
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === "active") syncFromServer()
    }
    const sub = AppState.addEventListener("change", handleAppState)
    return () => sub.remove()
  }, [syncFromServer])

  const updateSettings = useCallback(
    async (next: NotificationSettings) => {
      setSettings(next)
      await notificationSettingsService.update(next)
      await notificationService.scheduleAll(next)
    },
    [],
  )

  const requestAndEnable = useCallback(async (): Promise<boolean> => {
    const granted = await notificationService.requestPermissions()
    return granted
  }, [])

  return { settings, updateSettings, requestAndEnable }
}
