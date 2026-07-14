import { useEffect, useRef } from "react"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import type { MainTab } from "../types"

export function useHomeTabAnalytics(tab: MainTab): void {
  const lastTrackedTabRef = useRef<MainTab | null>(null)

  useEffect(() => {
    if (lastTrackedTabRef.current === tab) return
    lastTrackedTabRef.current = tab
    trackAnalyticsEvent(
      tab === "record" ? "home_record_viewed" : "home_statistics_viewed",
      {},
    )
  }, [tab])
}
