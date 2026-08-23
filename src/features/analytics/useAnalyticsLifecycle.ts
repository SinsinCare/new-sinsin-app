import { useEffect, useMemo, useRef } from "react"
import { AppState } from "react-native"
import { useSegments } from "expo-router"
import type { AppUser } from "@/src/services/types/serviceTypes"
import {
  initAnalyticsLifecycle,
  identifyAnalyticsUser,
  notifyAppBackgrounded,
  notifyAppForegrounded,
  resetAnalyticsIdentity,
  trackAnalyticsEvent,
} from "./analyticsClient"
import {
  getAnalyticsScreenName,
  getAnalyticsSignupStep,
  toDurationBucket,
} from "./events"
import { ScreenDwellTracker, type ScreenExitSignal } from "./screenDwell"

function emitScreenExits(signals: readonly ScreenExitSignal[]): void {
  for (const signal of signals) {
    trackAnalyticsEvent("screen_exited", {
      screen: signal.screen,
      reason: signal.reason,
      dwell_seconds: signal.dwellSeconds,
      dwell_bucket: toDurationBucket(signal.dwellSeconds * 1_000),
    })
  }
}

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
  const dwellTrackerRef = useRef<ScreenDwellTracker | null>(null)
  if (dwellTrackerRef.current === null) {
    dwellTrackerRef.current = new ScreenDwellTracker()
  }
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
    // 설치·업데이트·세션 시작 수명주기는 클라이언트가 자동으로 수집한다.
    initAnalyticsLifecycle()
    trackAnalyticsEvent("app_launch_started", {})
  }, [isAuthLoading])

  useEffect(() => {
    if (isAuthLoading) return
    const tracker = dwellTrackerRef.current
    if (tracker === null) return
    const transition = tracker.enter(screenName, Date.now())
    emitScreenExits(transition.exits)
    if (transition.entered) {
      trackAnalyticsEvent("screen_viewed", { screen: screenName })
    }
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
      const tracker = dwellTrackerRef.current
      const now = Date.now()
      if (state === "background") {
        if (tracker !== null) emitScreenExits(tracker.background(now))
        notifyAppBackgrounded()
      }
      if (state === "active") {
        notifyAppForegrounded()
        const resumedScreen = tracker?.resume(now) ?? null
        if (resumedScreen !== null) {
          trackAnalyticsEvent("screen_viewed", { screen: resumedScreen })
        }
      }
    })
    return () => subscription.remove()
  }, [])
}
