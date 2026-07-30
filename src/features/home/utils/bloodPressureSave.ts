import { parseVital } from "./vitalsJudgment"

export interface BloodPressureDraft {
  systolic: string
  diastolic: string
  heartRate: string
}

export interface BloodPressureAutoSaveRequest {
  systolic: number
  diastolic: number
  heartRate: number | null
  isComplete: boolean
  date: string
}

export function buildBloodPressureAutoSaveRequest(
  draft: BloodPressureDraft,
  date: string,
): BloodPressureAutoSaveRequest | null {
  const systolic = parseVital(draft.systolic)
  const diastolic = parseVital(draft.diastolic)
  const heartRate = parseVital(draft.heartRate)
  if (systolic === null || diastolic === null) return null

  return {
    systolic: Math.trunc(systolic),
    diastolic: Math.trunc(diastolic),
    heartRate: heartRate === null ? null : Math.trunc(heartRate),
    isComplete: heartRate !== null,
    date,
  }
}
