import { useEffect, useState } from "react"
import { Keyboard, Platform, type KeyboardEvent } from "react-native"
import { getKeyboardVisibilityEvents } from "./keyboardVisibility"

export function useKeyboardVisibility() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(() =>
    Keyboard.isVisible(),
  )

  useEffect(() => {
    const events = getKeyboardVisibilityEvents(Platform.OS)
    const updateVisibility = (visible: boolean) => (event: KeyboardEvent) => {
      if (Platform.OS === "ios") {
        Keyboard.scheduleLayoutAnimation(event)
      }
      setIsKeyboardVisible(visible)
    }

    const showSubscription = Keyboard.addListener(
      events.show,
      updateVisibility(true),
    )
    const hideSubscription = Keyboard.addListener(
      events.hide,
      updateVisibility(false),
    )

    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [])

  return isKeyboardVisible
}
