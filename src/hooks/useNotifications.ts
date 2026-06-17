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
  const [osPermissionGranted, setOsPermissionGranted] = useState(false)

  const syncFromServer = useCallback(async () => {
    if (!isAuthenticated) return
    const fetched = await notificationSettingsService.get()
    const granted = await notificationService.hasPermission()
    setSettings(fetched)
    setOsPermissionGranted(granted)
    await notificationService.scheduleAll(fetched)
    if (fetched.pushConsent && granted) {
      try {
        await notificationService.registerPushToken()
      } catch {
        // 자동 최신화 실패가 로컬 알림 예약과 설정 표시를 막으면 안 된다.
      }
    }
  }, [isAuthenticated])

  // 로그인 시 서버 설정 fetch → 스케줄 등록
  useEffect(() => {
    if (isAuthenticated) {
      syncFromServer()
    } else {
      notificationService.cancelAll()
      setSettings(DEFAULT_NOTIFICATION_SETTINGS)
      setOsPermissionGranted(false)
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

  const updateSettings = useCallback(async (next: NotificationSettings) => {
    setSettings(next)
    await notificationSettingsService.update(next)
    await notificationService.scheduleAll(next)
  }, [])

  const requestAndEnable = useCallback(async (): Promise<boolean> => {
    const granted = await notificationService.requestPermissions()
    setOsPermissionGranted(granted)
    return granted
  }, [])

  const setPushConsent = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      if (enabled) {
        const granted = await notificationService.requestPermissions()
        setOsPermissionGranted(granted)
        if (!granted) return false
        await notificationService.registerPushToken()
        const next = await notificationSettingsService.setPushConsent(true)
        setSettings(next)
        return true
      }

      const next = await notificationSettingsService.setPushConsent(false)
      setSettings(next)
      await notificationService.unregisterPushToken()
      const granted = await notificationService.hasPermission()
      setOsPermissionGranted(granted)
      return true
    },
    [],
  )

  return {
    settings,
    osPermissionGranted,
    pushEnabled: settings.pushConsent && osPermissionGranted,
    updateSettings,
    requestAndEnable,
    setPushConsent,
  }
}
