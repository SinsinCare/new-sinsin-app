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
  return systolic < 120 && diastolic < 80 ? "normal" : "caution"
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
