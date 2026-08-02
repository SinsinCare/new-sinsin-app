/**
 * 기능 첫 진입 안내의 표시 결정.
 *
 * 규칙 세 가지가 전부다.
 *  1. **화면이 실제로 보일 때만** 센다(useIsFocused). 탭은 마운트만 되고 안 보일 수 있다.
 *  2. 450ms 지연 후에 띄운다 — 화면이 먼저 그려져야 "이 화면의 안내" 로 읽힌다.
 *     진입과 동시에 시트가 덮으면 공지 팝업이 첫 화면을 가로채던 것과 같은 경험이 된다.
 *  3. 기기당 한 번. 닫는 즉시 기록한다(다 읽었는지는 묻지 않는다 — 다시 볼 길이
 *     없는 안내를 강제로 읽히는 것보다 스킵을 존중하는 쪽이 요즘 문법이다).
 *
 * `enabled` 는 식당 탭처럼 **기능 자체가 꺼져 있을 수 있는 화면**용이다.
 * 꺼진 채 "준비중" 화면에서 안내가 뜨면 없는 기능을 설명하는 셈이 된다.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { useIsFocused } from "@react-navigation/native"

import { featureIntroStorage, type FeatureIntroKey } from "./storage"

const SHOW_DELAY_MS = 450

export function useFeatureIntro(feature: FeatureIntroKey, enabled = true) {
  const isFocused = useIsFocused()
  const [visible, setVisible] = useState(false)
  // 한 세션에 한 번만 검사한다. 탭을 오갈 때마다 스토리지를 다시 읽을 이유가 없다.
  const checkedRef = useRef(false)

  useEffect(() => {
    if (!enabled || !isFocused || checkedRef.current) return
    checkedRef.current = true
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    void featureIntroStorage.hasSeen(feature).then((seen) => {
      if (seen || cancelled) return
      timer = setTimeout(() => {
        if (!cancelled) setVisible(true)
      }, SHOW_DELAY_MS)
    })

    return () => {
      cancelled = true
      if (timer !== null) clearTimeout(timer)
    }
  }, [enabled, feature, isFocused])

  const dismiss = useCallback(() => {
    setVisible(false)
    void featureIntroStorage.markSeen(feature)
  }, [feature])

  return { visible, dismiss }
}
