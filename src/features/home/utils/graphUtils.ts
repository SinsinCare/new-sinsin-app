export function fmt(n: number): string {
  return n.toLocaleString("ko-KR")
}

/**
 * left: `${centerPct}%` + transform: [{translateX: result}] 형태로 사용.
 * 아이템을 centerPct% 위치에 중앙 정렬하되, 오른쪽 아이템과 gap 이상 간격 유지.
 */
export function clampTranslateX(
  centerPct: number,
  itemWidth: number,
  barWidth: number,
  rightItemWidth: number,
  gap: number = 6,
): number {
  const rawT = -(itemWidth / 2)
  if (barWidth === 0) return rawT
  const centerPx = barWidth * (centerPct / 100)
  const maxT = barWidth - rightItemWidth - gap - centerPx - itemWidth
  const minT = -centerPx
  return Math.max(minT, Math.min(rawT, maxT))
}
