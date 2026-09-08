import { useEffect, useRef, useState } from "react"

/** Batch complete server-approved chunks. Never type out a partial number or Korean negation. */
export function useChatTranscript(content: string, streaming = true): string {
  const [visible, setVisible] = useState(content)
  const visibleRef = useRef(content)
  const target = useRef(content)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    target.current = content
    if (!streaming || !content.startsWith(visibleRef.current)) {
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
      visibleRef.current = content
      setVisible(content)
      return
    }
    if (timer.current || visibleRef.current === content) return
    timer.current = setTimeout(() => {
      timer.current = null
      visibleRef.current = target.current
      setVisible(target.current)
    }, 80)
  }, [content, streaming])
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  return streaming ? visible : content
}
