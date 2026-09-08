import { useCallback, useRef, useState, type RefObject } from "react"

interface TranscriptList {
  scrollToEnd(options: { animated: boolean }): void
}

/** Follow new output until the reader scrolls or opens a disclosure. Layout changes cannot re-enable it. */
export function useChatFollow({
  listRef,
  followRef,
  latestKey,
  streaming,
}: {
  listRef: RefObject<TranscriptList | null>
  followRef: RefObject<boolean>
  latestKey: string
  streaming: boolean
}) {
  const [awayFromBottom, setAway] = useState(false)
  const previousKey = useRef("")
  const metrics = useRef({ offset: 0, content: 0, viewport: 0 })
  const dragging = useRef(false)
  const userScroll = useRef(false)
  const gap = () =>
    metrics.current.content - metrics.current.offset - metrics.current.viewport

  const pause = useCallback(() => {
    dragging.current = false
    userScroll.current = false
    followRef.current = false
    setAway(streaming || gap() > 120)
  }, [followRef, streaming])
  const resume = useCallback(
    (animated = true) => {
      dragging.current = false
      userScroll.current = false
      followRef.current = true
      setAway(false)
      listRef.current?.scrollToEnd({ animated })
    },
    [followRef, listRef],
  )
  const onScroll = useCallback(
    (offset: number, content: number, viewport: number) => {
      const movedUp = offset < metrics.current.offset - 2
      metrics.current = { offset, content, viewport }
      // Accessibility scrolling can move without a drag event; downward layout corrections cannot resume a pause.
      if (dragging.current || (movedUp && content - offset - viewport >= 24))
        followRef.current = content - offset - viewport < 24
      setAway(
        !followRef.current && (streaming || content - offset - viewport > 120),
      )
    },
    [followRef, streaming],
  )
  const onContentSize = useCallback(
    (height: number) => {
      metrics.current.content = height
      if (previousKey.current !== latestKey) {
        previousKey.current = latestKey
        dragging.current = false
        userScroll.current = false
        followRef.current = true
        setAway(false)
      }
      if (followRef.current) listRef.current?.scrollToEnd({ animated: false })
      else setAway(streaming || gap() > 120)
    },
    [followRef, latestKey, listRef, streaming],
  )
  const onLayout = useCallback(
    (height: number) => {
      metrics.current.viewport = height
      if (followRef.current) listRef.current?.scrollToEnd({ animated: false })
    },
    [followRef, listRef],
  )
  const onDragStart = useCallback(() => {
    pause()
    dragging.current = true
    userScroll.current = true
  }, [pause])
  const onDragEnd = useCallback(() => {
    dragging.current = false
  }, [])
  const onMomentumStart = useCallback(() => {
    if (userScroll.current) dragging.current = true
  }, [])
  const onMomentumEnd = useCallback(() => {
    dragging.current = false
    userScroll.current = false
  }, [])
  return {
    awayFromBottom,
    pause,
    resume,
    onScroll,
    onContentSize,
    onLayout,
    onDragStart,
    onDragEnd,
    onMomentumStart,
    onMomentumEnd,
  }
}
