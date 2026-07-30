import { parseVital } from "./vitalsJudgment"

export interface BloodPressureDraft {
  systolic: string
  diastolic: string
  heartRate: string
}

export interface BloodPressureAutoSaveRequest {
  systolic?: number
  diastolic?: number
  heartRate?: number
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
  if (systolic === null && diastolic === null && heartRate === null) return null

  return {
    ...(systolic === null ? {} : { systolic: Math.trunc(systolic) }),
    ...(diastolic === null ? {} : { diastolic: Math.trunc(diastolic) }),
    ...(heartRate === null ? {} : { heartRate: Math.trunc(heartRate) }),
    isComplete: systolic !== null && diastolic !== null && heartRate !== null,
    date,
  }
}
