import { useCallback, useEffect, useRef, useState } from "react"
import * as Clipboard from "expo-clipboard"

export function useAddressCopy(
  value: string,
  onSuccess: () => void,
  onFailure: () => void,
) {
  const [justCopied, setJustCopied] = useState(false)
  const active = useRef(false)
  const mounted = useRef(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])
  const copy = useCallback(async () => {
    if (active.current || !mounted.current) return
    active.current = true
    try {
      const success = await Clipboard.setStringAsync(value)
      if (!mounted.current) return
      if (!success) {
        onFailure()
        return
      }
      setJustCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setJustCopied(false), 1600)
      onSuccess()
    } catch {
      if (mounted.current) onFailure()
    } finally {
      active.current = false
    }
  }, [value, onSuccess, onFailure])
  return { justCopied, copy }
}
