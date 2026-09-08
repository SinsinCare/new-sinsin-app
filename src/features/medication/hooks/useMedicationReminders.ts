import { useEffect } from "react"
import { usePathname } from "expo-router"
import { AppState } from "react-native"
import { useAuthStore } from "@/src/stores/authStore"
import {
  cancelMedicationReminders,
  syncMedicationReminders,
} from "../services/medicationReminders"
import { useMedicationFlowStore } from "../stores/medicationFlowStore"
export function useMedicationReminders(enabled: boolean) {
  const path = usePathname()
  useEffect(() => {
    if (!path.startsWith("/medication/") && path !== "/record/medication")
      useMedicationFlowStore.getState().clear()
  }, [path])
  const uid = useAuthStore((s) => s.user?.uid ?? "")
  useEffect(() => {
    useMedicationFlowStore.getState().clear()
    if (!enabled || !uid) {
      void cancelMedicationReminders().catch(() => {})
      return
    }
    const sync = () => void syncMedicationReminders(uid).catch(() => {})
    sync()
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") sync()
    })
    return () => {
      sub.remove()
      void cancelMedicationReminders().catch(() => {})
    }
  }, [enabled, uid])
}
