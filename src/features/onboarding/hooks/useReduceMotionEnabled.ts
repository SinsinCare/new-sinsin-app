import { useEffect, useState } from "react"
import { AccessibilityInfo } from "react-native"

export function useReduceMotionEnabled(): boolean | null {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    let isMounted = true
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) setIsEnabled(enabled)
      })
      .catch(() => {
        if (isMounted) setIsEnabled(true)
      })

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setIsEnabled,
    )
    return () => {
      isMounted = false
      subscription.remove()
    }
  }, [])

  return isEnabled
}
