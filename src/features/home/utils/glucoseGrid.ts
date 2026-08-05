/**
 * 혈당 하루치를 **끼니 × 시점 격자**로 다루는 곳. 네이티브 의존이 없어 jest 가 검증한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 왜 격자인가
 *
 * 종이 혈당 일지가 원래 이 모양이다 — 세로 아침/점심/저녁, 가로 식전/식후, 그리고 공복.
 * 서버 유니크도 마이그레이션 081 부터 `(user, date, slot, timing)` 이라 이 격자의 한 칸이
 * 한 행이다.
 *
 * 그 전에는 키가 `(user, date, timing)` 이었고 timing 은 셋뿐이라 **하루 3칸이 상한**이었다.
 * 아침 식후를 적은 날 저녁 식후를 적으면 아침 것이 조용히 사라졌다(200 이 돌아오므로
 * 사용자는 저장됐다고 믿는다). QA 2026-08-05 의 두 줄이 같은 뿌리다 —
 * "아침/점심/저녁 버튼이 없다"(넣어도 저장할 칸이 없었다)와
 * "혈당은 하루에 여러 번 재는데 추이가 안 보인다"(3점으로는 선이 안 그려진다).
 *
 * ■ 순서는 시계가 아니라 하루의 차례다
 *
 * 추이선의 x축은 측정 시각이 아니라 **하루의 차례**다(공복 → 아침 전 → 아침 후 → …).
 * 시각을 쓰지 않는 이유는 둘이다. 하나, 사용자에게 시각을 묻지 않는다 — 칩 두 줄이면
 * 끝날 입력에 시계를 더하면 기록을 그만둔다. 둘, 날짜끼리 겹쳐 볼 때 의미 있는 비교는
 * "8시 12분 대 8시 40분"이 아니라 **"아침 식후 대 아침 식후"** 다.
 *
 * `""`(끼니 모름) 칸은 맨 뒤로 보낸다. 아침이라고 추측해 끼워 넣지 않는다 — 없는 사실을
 * 지어내면 추이선이 거짓말을 한다.
 */

import type { GlucoseSlot, GlucoseTiming } from "../data/bloodMetricsConstants"

/** 격자 한 칸. 저장 키와 같은 축이다. */
export interface GlucoseCell {
  readonly slot: GlucoseSlot
  readonly timing: GlucoseTiming
}

/** 한 칸을 식별하는 문자열. Map·비교에 쓴다. */
export function glucoseCellKey({ slot, timing }: GlucoseCell): string {
  return `${slot}|${timing}`
}

/**
 * 하루의 차례. 이 순서가 칩 배치이자 추이선의 x축이다.
 *
 * 공복이 맨 앞인 이유는 임상 순서다 — 아침 식전보다도 앞(밤새 금식의 끝).
 */
export const GLUCOSE_DAY_SEQUENCE: readonly GlucoseCell[] = [
  { slot: "", timing: "FASTING" },
  { slot: "BREAKFAST", timing: "BEFORE_MEAL" },
  { slot: "BREAKFAST", timing: "AFTER_MEAL" },
  { slot: "LUNCH", timing: "BEFORE_MEAL" },
  { slot: "LUNCH", timing: "AFTER_MEAL" },
  { slot: "DINNER", timing: "BEFORE_MEAL" },
  { slot: "DINNER", timing: "AFTER_MEAL" },
  // 끼니를 모르는 옛 기록·구버전 앱의 기록. 추측해서 위로 올리지 않는다.
  { slot: "", timing: "BEFORE_MEAL" },
  { slot: "", timing: "AFTER_MEAL" },
]

const SEQUENCE_INDEX = new Map(
  GLUCOSE_DAY_SEQUENCE.map((cell, index) => [glucoseCellKey(cell), index]),
)

/** 격자에 없는 조합(구서버의 예상 밖 값)은 맨 뒤로. 버리지는 않는다. */
export function glucoseCellOrder(cell: GlucoseCell): number {
  return SEQUENCE_INDEX.get(glucoseCellKey(cell)) ?? GLUCOSE_DAY_SEQUENCE.length
}

/**
 * 서버가 준 하루치를 **하루의 차례**로 세운다.
 *
 * 서버는 삽입 순(id)으로 준다 — 저녁을 먼저 적고 아침을 나중에 적으면 그 순서 그대로다.
 * 그 배열을 그대로 그리면 선이 시간을 거꾸로 간다.
 */
export function orderGlucoseByDay<
  T extends { slot?: GlucoseSlot; timing: GlucoseTiming },
>(records: readonly T[]): T[] {
  return [...records].sort(
    (a, b) =>
      glucoseCellOrder({ slot: a.slot ?? "", timing: a.timing }) -
      glucoseCellOrder({ slot: b.slot ?? "", timing: b.timing }),
  )
}

/**
 * 그 칸에 이미 저장된 기록. **끼니까지 맞아야 같은 칸이다.**
 *
 * 시점만 보고 찾던 시절에는 아침 식후 값이 저녁 식후 칸에 떠서, 사용자가 그대로 저장하면
 * 아침 수치가 저녁 수치로 복제됐다.
 */
export function findGlucoseCell<
  T extends { slot?: GlucoseSlot; timing: GlucoseTiming },
>(records: readonly T[], cell: GlucoseCell): T | null {
  const key = glucoseCellKey(cell)
  return (
    records.find(
      (record) =>
        glucoseCellKey({ slot: record.slot ?? "", timing: record.timing }) ===
        key,
    ) ?? null
  )
}

/**
 * 저장에 실을 끼니 값. **공복이면 언제나 빠진다** — 서버가 400 으로 막는 조합이라
 * 화면이 실수로도 실을 수 없게 여기서 한 번에 정한다.
 */
export function slotForSubmit(
  cell: GlucoseCell,
): Exclude<GlucoseSlot, ""> | null {
  if (cell.timing === "FASTING") return null
  return cell.slot === "" ? null : cell.slot
}
