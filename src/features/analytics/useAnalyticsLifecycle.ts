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
import { getAnalyticsScreenName, getAnalyticsSignupStep } from "./events"

export function useAnalyticsLifecycle(
  user: AppUser | null,
  isAuthLoading: boolean,
): void {
  const segments = useSegments()
  const screenName = useMemo(
    () => getAnalyticsScreenName(segments.map(String)),
    [segments],
  )
  const routeSegments = useMemo(() => segments.map(String), [segments])
  const signupStep = useMemo(
    () => getAnalyticsSignupStep(routeSegments),
    [routeSegments],
  )
  const lastScreenRef = useRef<string | null>(null)
  const lastSignupStepRef = useRef<string | null>(null)
  const loginViewedRef = useRef(false)

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
    if (isAuthLoading) return

    const [group, route] = routeSegments
    const isLoginLanding = group === "(auth)" && route === "login"
    if (isLoginLanding) {
      if (!loginViewedRef.current) {
        trackAnalyticsEvent("auth_login_viewed", {})
      }
      loginViewedRef.current = true
    } else {
      loginViewedRef.current = false
    }

    if (!signupStep) {
      lastSignupStepRef.current = null
      return
    }
    if (lastSignupStepRef.current === signupStep) return
    lastSignupStepRef.current = signupStep
    trackAnalyticsEvent("auth_signup_step_viewed", { step: signupStep })
  }, [isAuthLoading, routeSegments, signupStep])

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") flushAnalytics()
    })
    return () => subscription.remove()
  }, [])
}
