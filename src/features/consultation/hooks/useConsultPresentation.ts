import { useEffect, useRef, useState } from "react"

/** Latest state wins: short reads never become a queue of obsolete status labels. */
export function useStableConsultStatus<T extends string>(
  target: T,
  active: boolean,
): T {
  const [visible, setVisible] = useState(target)
  const shownAt = useRef(Date.now())
  useEffect(() => {
    if (target === visible) return
    if (!active) {
      shownAt.current = Date.now()
      setVisible(target)
      return
    }
    const timer = setTimeout(
      () => {
        shownAt.current = Date.now()
        setVisible(target)
      },
      Math.max(240, 640 - (Date.now() - shownAt.current)),
    )
    return () => clearTimeout(timer)
  }, [target, active, visible])
  // Stop/failure/completion must never claim work is still running.
  return active ? visible : target
}

/** Final prose paints first. Only a live turn gets the short result handoff. */
export function useConsultResultReveal(
  streaming: boolean,
  failed: boolean,
  beforeReveal?: () => void,
) {
  const wasLive = useRef(streaming)
  const onReveal = useRef(beforeReveal)
  onReveal.current = beforeReveal
  const [ready, setReady] = useState(!streaming)
  useEffect(() => {
    if (streaming) {
      wasLive.current = true
      setReady(false)
      return
    }
    if (failed || !wasLive.current) return
    const timer = setTimeout(() => {
      // Retain the reader's final-prose position before the result changes list height.
      onReveal.current?.()
      setReady(true)
    }, 120)
    return () => clearTimeout(timer)
  }, [streaming, failed])
  return { ready: !streaming && !failed && ready, animate: wasLive.current }
}
