import { useCallback, useEffect, useRef, useState } from "react"
import { AppState, Linking } from "react-native"
import * as Notifications from "expo-notifications"
export type ReminderPermission =
  | "unknown"
  | "allowed"
  | "quiet"
  | "blocked"
  | "ask"
export function reminderPermissionState(
  p: Notifications.NotificationPermissionsStatus,
): ReminderPermission {
  if (p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL)
    return "quiet"
  if (p.granted) return "allowed"
  return p.canAskAgain ? "ask" : "blocked"
}
export function useMedicationReminderPermission() {
  const [permission, setPermission] = useState<ReminderPermission>("unknown")
  const [busy, setBusy] = useState(false)
  const mounted = useRef(false),
    pending = useRef(false)
  const refresh = useCallback(async () => {
    try {
      const p = reminderPermissionState(
        await Notifications.getPermissionsAsync(),
      )
      if (mounted.current) setPermission(p)
      return p
    } catch {
      return "unknown" as const
    }
  }, [])
  useEffect(() => {
    mounted.current = true
    void refresh()
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh()
    })
    return () => {
      mounted.current = false
      subscription.remove()
    }
  }, [refresh])
  const ensure = async () => {
    if (pending.current) return false
    pending.current = true
    setBusy(true)
    try {
      let p = await refresh()
      if (p === "ask" || p === "unknown") {
        p = reminderPermissionState(
          await Notifications.requestPermissionsAsync({
            ios: { allowAlert: true, allowBadge: false, allowSound: true },
          }),
        )
        if (mounted.current) setPermission(p)
      }
      return p === "allowed" || p === "quiet"
    } catch {
      return false
    } finally {
      pending.current = false
      if (mounted.current) setBusy(false)
    }
  }
  return {
    permission,
    busy,
    ensure,
    openSettings: () => void Linking.openSettings(),
  }
}
