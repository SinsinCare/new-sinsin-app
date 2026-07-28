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
    if (fetched.pushConsent && granted) {
      await notificationService.scheduleAll(fetched)
      try {
        await notificationService.registerPushToken()
      } catch {
        // 자동 최신화 실패가 로컬 알림 예약과 설정 표시를 막으면 안 된다.
      }
    } else {
      await notificationService.cancelAll()
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
    const granted = await notificationService.hasPermission()
    setOsPermissionGranted(granted)
    if (next.pushConsent && granted) {
      await notificationService.scheduleAll(next)
    } else {
      await notificationService.cancelAll()
    }
  }, [])

  const setPushConsent = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      if (enabled) {
        const granted = await notificationService.requestPermissions()
        setOsPermissionGranted(granted)
        if (!granted) return false
        const next = await notificationSettingsService.setPushConsent(true)
        setSettings(next)
        try {
          await notificationService.registerPushToken()
        } catch {
          // 제품 동의는 저장됐고, 다음 동기화 때 토큰 등록을 다시 시도한다.
        }
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

  const setNightPushConsent = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      const granted = await notificationService.hasPermission()
      setOsPermissionGranted(granted)
      if (enabled && (!settings.pushConsent || !granted)) return false

      const next =
        await notificationSettingsService.setNightPushConsent(enabled)
      setSettings(next)
      return true
    },
    [settings.pushConsent],
  )

  return {
    settings,
    osPermissionGranted,
    pushEnabled: settings.pushConsent && osPermissionGranted,
    updateSettings,
    setPushConsent,
    setNightPushConsent,
  }
}
