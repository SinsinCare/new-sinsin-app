export function clampWaterIntake(amount: number): number {
  return Math.max(0, amount)
}

/**
 * 화면에 그리는 수분 — **사용자가 적은 물만**이다(`extraWater`).
 *
 * 한동안 `analysis.water`(국·과일 등 음식 수분)를 더해 그렸다. 임상적으로 "제한까지 남은
 * 양"은 총 수분이 맞지만, 그 숫자는 **물 시트가 편집하는 값이 아니다** — 잔·되돌리기·총량
 * 직접 입력은 전부 `extraWater` 증감으로 나가므로, 큰 숫자만 음식 수분을 포함하면 총량을
 * 고쳐 적을 때 마신 적 없는 물을 기준으로 증감이 계산된다. 게다가 음식 수분은 끼니 재집계가
 * 끝나야 채워져서, 물을 마시지 않았는데 숫자가 혼자 늘어난 것처럼 보였다(2026-08-19 신고).
 *
 * 음식 수분은 서버가 계속 집계·저장한다 — 없애는 것이 아니라 이 화면에서 말하지 않는다.
 */
export function displayedWaterIntake(
  analysis:
    | { readonly water?: number | null; readonly extraWater?: number | null }
    | null
    | undefined,
): number {
  return clampWaterIntake(analysis?.extraWater ?? 0)
}
