import { useCallback, useEffect, useRef, useState } from "react"
import { Linking } from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import { useBilling } from "../BillingProvider"
import { managementUrl, restore } from "../purchases/purchasesClient"
import { didRestoreSomething } from "../restoreOutcome"
import { trackAnalyticsEvent } from "@/src/features/analytics"

export function useSubscriptionScreen() {
  const billing = useBilling()
  const { refresh } = billing
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const [busy, setBusy] = useState<"manage" | "restore" | null>(null)
  const [notice, setNotice] = useState<{
    key:
      | "subscription.restoreDone"
      | "subscription.restoreEmpty"
      | "subscription.restoreError"
      | "subscription.manageError"
    error: boolean
  } | null>(null)
  const lock = useRef(false)
  const revision = useRef(0)
  useEffect(() => {
    revision.current += 1
    setNotice(null)
    return () => {
      revision.current += 1
    }
  }, [billing.status?.appUserId])
  useFocusEffect(
    useCallback(() => {
      void refresh().catch(() => undefined)
    }, [refresh]),
  )

  const run = async (action: "manage" | "restore") => {
    if (lock.current) return
    lock.current = true
    const current = revision.current
    setBusy(action)
    setNotice(null)
    try {
      if (action === "manage") {
        const url = await managementUrl()
        if (current === revision.current) await Linking.openURL(url)
      } else {
        const outcome = await restore()
        if (current !== revision.current || outcome.status === "cancelled")
          return
        if (outcome.status !== "purchased") throw new Error("restore failed")
        const synced = await billing.syncNow()
        if (current !== revision.current) return
        if (!synced) throw new Error("sync unavailable")
        const restored = didRestoreSomething(outcome.status, synced)
        trackAnalyticsEvent("restore_completed", { restored })
        setNotice({
          key: restored
            ? "subscription.restoreDone"
            : "subscription.restoreEmpty",
          error: false,
        })
      }
    } catch {
      if (current === revision.current)
        setNotice({
          key:
            action === "manage"
              ? "subscription.manageError"
              : "subscription.restoreError",
          error: true,
        })
    } finally {
      lock.current = false
      if (mounted.current) setBusy(null)
    }
  }
  return {
    ...billing,
    busy,
    notice,
    onManage: () => run("manage"),
    onRestore: () => run("restore"),
  }
}
