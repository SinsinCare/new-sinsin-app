import { useState, useEffect, useCallback, useRef } from "react"
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

  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const revision = useRef(0)
  const writing = useRef(false)

  const syncFromServer = useCallback(async () => {
    if (!isAuthenticated || writing.current) return
    const request = ++revision.current
    try {
      const [fetched, granted] = await Promise.all([
        notificationSettingsService.get(),
        notificationService.hasPermission(),
      ])
      if (request !== revision.current) return
      setSettings(fetched)
      setOsPermissionGranted(granted)
      setIsReady(true)
      setError(null)
      await Promise.allSettled([
        notificationService.scheduleAll(fetched),
        ...(fetched.pushConsent && granted
          ? [notificationService.registerPushToken()]
          : []),
      ])
    } catch (cause) {
      if (request !== revision.current) return
      setError(cause)
      setIsReady(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) void syncFromServer()
    else {
      void notificationService.cancelAll().catch(() => {})
      setSettings(DEFAULT_NOTIFICATION_SETTINGS)
      setOsPermissionGranted(false)
      setIsReady(false)
      setError(null)
    }
    return () => {
      revision.current += 1
    }
  }, [isAuthenticated, syncFromServer])

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") void syncFromServer()
    })
    return () => sub.remove()
  }, [syncFromServer])

  const updateSettings = useCallback(async (next: NotificationSettings) => {
    writing.current = true
    const request = ++revision.current
    try {
      await notificationSettingsService.update(next)
      if (request !== revision.current) return
      setSettings(next)
      // Consent is already saved; scheduling failure must not undo its displayed value.
      await Promise.allSettled([notificationService.scheduleAll(next)])
    } finally {
      writing.current = false
    }
  }, [])

  const requestAndEnable = useCallback(async (): Promise<boolean> => {
    const granted = await notificationService.requestPermissions()
    setOsPermissionGranted(granted)
    return granted
  }, [])

  const setPushConsent = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      writing.current = true
      const request = ++revision.current
      try {
        if (enabled) {
          const granted = await notificationService.requestPermissions()
          setOsPermissionGranted(granted)
          if (!granted) return false
          await notificationService.registerPushToken()
          const next = await notificationSettingsService.setPushConsent(true)
          if (request === revision.current) setSettings(next)
          return true
        }

        const next = await notificationSettingsService.setPushConsent(false)
        if (request === revision.current) setSettings(next)
        await notificationService.unregisterPushToken()
        const granted = await notificationService.hasPermission()
        setOsPermissionGranted(granted)
        return true
      } finally {
        writing.current = false
      }
    },
    [],
  )

  return {
    settings,
    isReady,
    error,
    retry: syncFromServer,
    osPermissionGranted,
    pushEnabled: settings.pushConsent && osPermissionGranted,
    updateSettings,
    requestAndEnable,
    setPushConsent,
  }
}
