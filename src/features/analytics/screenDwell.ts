import type { AnalyticsScreenName } from "./events"

export type ScreenExitReason = "navigation" | "background"

export interface ScreenExitSignal {
  readonly screen: AnalyticsScreenName
  readonly reason: ScreenExitReason
  readonly dwellSeconds: number
}

export interface ScreenEnterResult {
  readonly exits: readonly ScreenExitSignal[]
  readonly entered: boolean
}

const MAX_DWELL_SECONDS = 24 * 60 * 60

function dwellSeconds(startMs: number, endMs: number): number {
  return Math.max(
    0,
    Math.min(MAX_DWELL_SECONDS, Math.round((endMs - startMs) / 1_000)),
  )
}

/**
 * 화면 체류 구간 상태 머신.
 *
 * React 렌더 횟수와 무관하게 한 화면 구간당 enter 1번 / exit 1번만 만든다. background는
 * 구간을 닫고, foreground resume은 같은 화면의 새 구간을 연다. 그래야 "홈에서 5분"
 * 안에 앱을 2시간 백그라운드에 둔 시간이 섞이지 않는다.
 */
export class ScreenDwellTracker {
  private screen: AnalyticsScreenName | null = null
  private enteredAtMs: number | null = null

  public enter(screen: AnalyticsScreenName, nowMs: number): ScreenEnterResult {
    if (this.screen === screen) return { exits: [], entered: false }
    const exits = this.exit("navigation", nowMs)
    this.screen = screen
    this.enteredAtMs = nowMs
    return { exits, entered: true }
  }

  public background(nowMs: number): ScreenExitSignal[] {
    return this.exit("background", nowMs)
  }

  /** 같은 route로 복귀해도 새 screen_viewed 구간을 시작해야 하므로 화면명을 돌려준다. */
  public resume(nowMs: number): AnalyticsScreenName | null {
    if (this.screen === null || this.enteredAtMs !== null) return null
    this.enteredAtMs = nowMs
    return this.screen
  }

  private exit(reason: ScreenExitReason, nowMs: number): ScreenExitSignal[] {
    if (this.screen === null || this.enteredAtMs === null) return []
    const signal: ScreenExitSignal = {
      screen: this.screen,
      reason,
      dwellSeconds: dwellSeconds(this.enteredAtMs, nowMs),
    }
    this.enteredAtMs = null
    return [signal]
  }
}
