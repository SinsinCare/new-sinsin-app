import type { GlucoseTiming } from "../data/bloodMetricsConstants"

export type VitalStatus = "normal" | "caution" | "none"

export function parseVital(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function judgeBloodPressure(
  systolic: number | null,
  diastolic: number | null,
): VitalStatus {
  if (systolic === null || diastolic === null) return "none"
  // 정상 = 수축 90~119 그리고 이완 60~79. 상·하한 모두 벗어나면 주의(저혈압 포함).
  const normal =
    systolic >= 90 && systolic < 120 && diastolic >= 60 && diastolic < 80
  return normal ? "normal" : "caution"
}

export function judgeGlucose(
  value: number | null,
  timing: GlucoseTiming,
): VitalStatus {
  if (value === null) return "none"
  const min = timing === "AFTER_MEAL" ? 90 : 70
  const max = timing === "AFTER_MEAL" ? 139 : 99
  return value >= min && value <= max ? "normal" : "caution"
}
