import { useCallback, useEffect, useRef, useState } from "react"
import { Linking } from "react-native"
import type { MapAppKey, MapAppLink } from "../utils/mapAppLinks"

export function useRouteAppLaunch({
  visible,
  targetKey,
  onClose,
}: {
  visible: boolean
  targetKey: string
  onClose: () => void
}) {
  const active = useRef<object | null>(null)
  const context = useRef({ visible, targetKey })
  context.current = { visible, targetKey }
  const [opening, setOpening] = useState<MapAppKey | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    active.current = null
    setOpening(null)
    setFailed(false)
    return () => {
      active.current = null
    }
  }, [visible, targetKey])

  const close = useCallback(() => {
    active.current = null
    setOpening(null)
    setFailed(false)
    onClose()
  }, [onClose])

  const open = useCallback(
    async (link: MapAppLink) => {
      if (!context.current.visible || active.current) return
      const request = {}
      active.current = request
      const current = () =>
        active.current === request &&
        context.current.visible &&
        context.current.targetKey === targetKey
      setOpening(link.key)
      setFailed(false)
      try {
        try {
          await Linking.openURL(link.appUrl)
        } catch {
          if (!current()) return
          // Do not repeat the same URL for apps whose web and native link coincide.
          if (link.webUrl === link.appUrl)
            throw new Error("No alternate route URL")
          await Linking.openURL(link.webUrl)
        }
        if (current()) onClose()
        // Keep locked until the sheet actually closes, including slow parent renders.
      } catch {
        if (!current()) return
        active.current = null
        setOpening(null)
        setFailed(true)
      }
    },
    [onClose, targetKey],
  )

  return { open, close, opening, failed }
}
