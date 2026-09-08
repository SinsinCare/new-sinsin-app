import { useEffect, useState } from "react"
import { AccessibilityInfo, AppState } from "react-native"
import { useIsFocused } from "@react-navigation/native"
import { useReducedMotion } from "react-native-reanimated"

/** Only the visible, active response animates; OS accessibility changes apply live. */
export function useConsultMotion(active: boolean) {
  const focused = useIsFocused()
  const initialReducedMotion = useReducedMotion()
  const [reducedMotion, setReducedMotion] = useState(initialReducedMotion)
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  )

  useEffect(() => {
    if (!active || !focused) return
    let disposed = false
    let settingChanged = false
    setForeground(AppState.currentState === "active")
    const app = AppState.addEventListener("change", (state) => {
      setForeground(state === "active")
    })
    const motion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => {
        settingChanged = true
        setReducedMotion(value)
      },
    )
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (!disposed && !settingChanged) setReducedMotion(value)
      })
      .catch(() => {
        /* Keep the synchronous system preference if the query fails. */
      })
    return () => {
      disposed = true
      app.remove()
      motion.remove()
    }
  }, [active, focused])

  return active && focused && foreground && !reducedMotion
}
