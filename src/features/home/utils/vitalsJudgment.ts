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
  // This card records home measurements. The Korean home-BP hypertension threshold is
  // 135/85 mmHg, so common self-measurements such as 120/80 must not be marked caution.
  // This is a display aid, not a patient's individualized CKD treatment target.
  const normal =
    systolic >= 90 && systolic < 135 && diastolic >= 60 && diastolic < 85
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
