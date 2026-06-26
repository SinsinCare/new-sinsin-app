import type { MainTab } from "../types"

interface ReleasedHomePagerTabParams {
  current: MainTab
  dx: number
  vx: number
  width: number
}

export function getCommittedHomePagerValue(tab: MainTab): 0 | 1 {
  return tab === "record" ? 0 : 1
}

export function getReleasedHomePagerTab({
  current,
  dx,
  vx,
  width,
}: ReleasedHomePagerTabParams): MainTab {
  const shouldGoToStats =
    current === "record" && (dx < -width * 0.3 || vx < -0.5)
  const shouldGoToRecord = current === "stats" && (dx > width * 0.3 || vx > 0.5)

  if (shouldGoToStats) {
    return "stats"
  }
  if (shouldGoToRecord) {
    return "record"
  }
  return current
}
