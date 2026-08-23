import { useCallback, useEffect, useRef } from "react"

import {
  trackAnalyticsEvent,
  type AnalyticsHealthInputKind,
  type AnalyticsHealthMetric,
} from "@/src/features/analytics"

/**
 * "이 시트에서 **처음** 값이 생겼다" 를 한 번만 쏜다.
 *
 * ■ 왜 시트마다 손으로 다는가
 *
 * 다섯 시트의 입력 컨트롤이 제각각이다 — 물은 잔 버튼(프리셋)과 총량 키패드, 체중은
 * 스테퍼와 키패드, 혈압은 두 칸의 숫자 입력, 혈당은 키패드, 부종은 선택 카드. 공통
 * 뼈대(`RecordSheetShell`)는 CTA 와 머리만 알고 본문은 `children` 이라, 한 자리에서
 * 값이 생기는 순간을 잡을 방법이 없다. 그래서 잡는 자리는 시트마다 두되 **가드와
 * 이벤트 모양은 여기 하나**로 모은다.
 *
 * ■ 왜 1회 가드가 필수인가
 *
 * 이 자리들은 전부 고빈도다. 키패드는 한 자릿수마다, 스테퍼는 누를 때마다, 잔 버튼은
 * 잔마다 콜백이 온다. 가드 없이 달면 이벤트 하나가 세션의 이벤트 수를 지배하고
 * (설계 §J2-4 4), 그러면 '입력을 시작한 사람 수' 가 '키를 누른 횟수' 가 되어
 * 퍼널 3→4 가 아무 뜻도 없는 숫자가 된다.
 *
 * 가드는 **시트가 닫힐 때 풀린다** — 같은 사람이 물을 두 번 기록하면 두 번 세는 것이
 * 맞다. 마운트 1회로 잠그면 홈이 살아 있는 내내 두 번째 기록이 안 보인다(기록 시트는
 * 한 번 열린 뒤 계속 마운트를 유지한다 — `RecordView` 의 `mountedSheets`).
 */
export function useHealthEntryInput(
  metric: AnalyticsHealthMetric,
  visible: boolean,
): (inputKind: AnalyticsHealthInputKind) => void {
  const firedRef = useRef(false)

  useEffect(() => {
    if (!visible) firedRef.current = false
  }, [visible])

  return useCallback(
    (inputKind: AnalyticsHealthInputKind) => {
      if (firedRef.current) return
      firedRef.current = true
      // 값 자체는 절대 싣지 않는다 — 무엇으로 넣기 시작했는지만 남는다.
      trackAnalyticsEvent("health_entry_input_started", {
        metric,
        input_kind: inputKind,
      })
    },
    [metric],
  )
}
