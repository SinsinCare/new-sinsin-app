import { useEffect, useMemo, useRef } from "react"
import { AppState } from "react-native"
import { useSegments } from "expo-router"
import type { AppUser } from "@/src/services/types/serviceTypes"
import {
  flushAnalytics,
  identifyAnalyticsUser,
  resetAnalyticsIdentity,
  trackAnalyticsEvent,
} from "./analyticsClient"
import { getAnalyticsScreenName } from "./events"

export function useAnalyticsLifecycle(
  user: AppUser | null,
  isAuthLoading: boolean,
): void {
  const segments = useSegments()
  const screenName = useMemo(
    () => getAnalyticsScreenName(segments.map(String)),
    [segments],
  )
  const lastScreenRef = useRef<string | null>(null)

  const launchTrackedRef = useRef(false)

  useEffect(() => {
    if (isAuthLoading) return
    if (user?.uid) identifyAnalyticsUser(user.uid)
    else resetAnalyticsIdentity()
  }, [isAuthLoading, user?.uid])

  useEffect(() => {
    if (isAuthLoading || launchTrackedRef.current) return
    launchTrackedRef.current = true
    trackAnalyticsEvent("app_launch_started", {})
  }, [isAuthLoading])

  useEffect(() => {
    if (isAuthLoading) return
    if (lastScreenRef.current === screenName) return
    lastScreenRef.current = screenName
    trackAnalyticsEvent("screen_viewed", { screen: screenName })
  }, [isAuthLoading, screenName])

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") flushAnalytics()
    })
    return () => subscription.remove()
  }, [])
}
