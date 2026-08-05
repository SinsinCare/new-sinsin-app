/**
 * 통계의 혈당 추이 — **무엇을 그릴지**를 정하는 순수 모듈(RN 의존 없음, jest 가 본다).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ x축이 날짜가 아니라 "하루의 차례"인 이유
 *
 * 혈당은 하루에 여러 번 재고, 그 값의 의미는 **언제 쟀는가**에 붙어 있다. 공복 96 과
 * 저녁 식후 96 은 같은 숫자지만 다른 사실이다. 그래서 7일치를 날짜 축 하나에 이어 붙이면
 * 톱니만 남고 읽을 것이 없다 — 매일 오르내리는 것이 당연하기 때문이다.
 *
 * 대신 하루의 차례(공복 → 아침 전 → 아침 후 → … → 저녁 후)를 x축으로 두고 **날짜별 선을
 * 겹쳐 그린다.** 그러면 "저녁 식후만 늘 높다" 같은 패턴이 그 자리에서 보인다. 이것이
 * 혈당 일지를 읽는 방식이고, 그 패턴이 바꿀 수 있는 행동(그 끼니의 양·구성)에 닿는다.
 *
 * 선택한 날은 진하게, 나머지 날은 옅게 깔린다 — 오늘이 평소와 어디서 갈리는지가 비교의 축이다.
 *
 * ■ 목표 구간이 두 개인 것을 접지 않는다
 *
 * 식후 목표(90–180)와 식전·공복 목표(70–99)는 다르다. 하나로 뭉친 띠를 깔면 어느 쪽에도
 * 맞지 않는 기준선이 된다. 그래서 띠는 칸마다 그 칸의 목표를 쓴다 — 계단 모양이 된다.
 * `judgeGlucoseValue` 와 **같은 숫자**를 쓴다(`vitalsJudgment.ts`). 화면이 제 기준을 다시
 * 만들면 시트의 배지와 통계의 띠가 서로 다른 말을 한다.
 */

import type { GlucoseSlot, GlucoseTiming } from "../data/bloodMetricsConstants"
import { GLUCOSE_DAY_SEQUENCE, glucoseCellKey } from "./glucoseGrid"
import { getGlucoseTarget } from "./vitalsJudgment"

export interface GlucoseTrendRecord {
  recordDate: string
  slot?: GlucoseSlot
  timing: GlucoseTiming
  value: number
}

/** x축 한 칸. `key` 는 i18n 라벨 조립에 쓴다(`slot` 이 비면 시점만). */
export interface GlucoseAxisCell {
  slot: GlucoseSlot
  timing: GlucoseTiming
  targetMin: number
  targetMax: number
}

export interface GlucoseTrendPoint {
  /** `GLUCOSE_AXIS` 의 인덱스. */
  index: number
  value: number
  /** 그 칸의 목표를 벗어났다. 점을 강조할지 결정한다. */
  outOfTarget: boolean
}

export interface GlucoseTrendLine {
  date: string
  points: GlucoseTrendPoint[]
}

export interface GlucoseTrendSummary {
  /** 창 안의 모든 측정 수. 0 이면 화면은 빈 상태를 그린다. */
  count: number
  /** 측정이 있었던 날의 수 — "7일 중 4일 기록" 같은 문장을 만든다. */
  days: number
  average: number | null
  min: number | null
  max: number | null
  /** 목표 구간 안에 든 비율(0~1). 칸마다 그 칸의 목표로 판정한다. */
  inTargetRatio: number | null
  /**
   * 가장 자주 목표를 벗어난 칸. 없으면 null.
   * 화면은 이것으로 "저녁 식후가 가장 자주 높았어요" 한 줄을 만든다.
   */
  worstCell: {
    slot: GlucoseSlot
    timing: GlucoseTiming
    overCount: number
  } | null
}

export interface GlucoseTrendModel {
  axis: GlucoseAxisCell[]
  /** 날짜 오름차순. 마지막이 가장 최근이다. */
  lines: GlucoseTrendLine[]
  summary: GlucoseTrendSummary
  /** y축 경계. 데이터가 목표 밖으로 나가면 함께 넓어진다. */
  yMin: number
  yMax: number
}

/**
 * 축은 **격자의 앞 7칸**이다 — 공복 + 3끼니 × 식전/식후.
 * 끼니를 모르는 옛 기록(`slot: ""` 인 식전/식후)은 축에 자리가 없어 선에서 빠진다.
 * 그 값을 아침 자리에 끼워 넣으면 없는 사실을 그리는 것이라, 요약(평균·최고)에만 센다.
 */
export const GLUCOSE_AXIS: GlucoseAxisCell[] = GLUCOSE_DAY_SEQUENCE.slice(
  0,
  7,
).map((cell) => {
  const target = getGlucoseTarget(cell.timing)
  return {
    slot: cell.slot,
    timing: cell.timing,
    targetMin: target.min,
    targetMax: target.max,
  }
})

const AXIS_INDEX = new Map(
  GLUCOSE_AXIS.map((cell, index) => [glucoseCellKey(cell), index]),
)

/** y축의 최소 폭. 값이 몰려 있어도 선이 화면 높이를 가득 튀지 않게 한다. */
const Y_PADDING = 20
const Y_FLOOR = 60
const Y_CEILING = 200

export function buildGlucoseTrend(
  records: readonly GlucoseTrendRecord[],
): GlucoseTrendModel {
  const byDate = new Map<string, GlucoseTrendPoint[]>()
  let sum = 0
  let inTarget = 0
  let min: number | null = null
  let max: number | null = null
  const overByCell = new Map<string, number>()

  for (const record of records) {
    const cellKey = glucoseCellKey({
      slot: record.slot ?? "",
      timing: record.timing,
    })
    const target = getGlucoseTarget(record.timing)
    const outOfTarget = record.value < target.min || record.value > target.max

    sum += record.value
    if (!outOfTarget) inTarget += 1
    min = min === null ? record.value : Math.min(min, record.value)
    max = max === null ? record.value : Math.max(max, record.value)
    if (outOfTarget) {
      overByCell.set(cellKey, (overByCell.get(cellKey) ?? 0) + 1)
    }

    const index = AXIS_INDEX.get(cellKey)
    // 축에 자리가 없는 기록(끼니 모름)은 선에서 빠지되 요약에는 남는다 — 위 머리말 참고.
    if (index === undefined) continue
    const points = byDate.get(record.recordDate) ?? []
    points.push({ index, value: record.value, outOfTarget })
    byDate.set(record.recordDate, points)
  }

  const lines: GlucoseTrendLine[] = [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, points]) => ({
      date,
      points: [...points].sort((a, b) => a.index - b.index),
    }))

  const count = records.length
  const days = new Set(records.map((record) => record.recordDate)).size

  let worstCell: GlucoseTrendSummary["worstCell"] = null
  for (const [key, overCount] of overByCell) {
    if (worstCell !== null && overCount <= worstCell.overCount) continue
    const [slot = "", timing = ""] = key.split("|")
    worstCell = {
      slot: slot as GlucoseSlot,
      timing: timing as GlucoseTiming,
      overCount,
    }
  }

  return {
    axis: GLUCOSE_AXIS,
    lines,
    summary: {
      count,
      days,
      average: count === 0 ? null : Math.round(sum / count),
      min,
      max,
      inTargetRatio: count === 0 ? null : inTarget / count,
      worstCell,
    },
    // 목표 띠는 언제나 보이고, 데이터가 그 밖으로 나가면 축이 따라 넓어진다.
    yMin: Math.min(Y_FLOOR, (min ?? Y_FLOOR) - Y_PADDING),
    yMax: Math.max(Y_CEILING, (max ?? Y_CEILING) + Y_PADDING),
  }
}
