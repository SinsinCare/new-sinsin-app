import type {
  GlucoseElapsed,
  GlucoseTiming,
} from "@/src/features/home/data/bloodMetricsConstants"

export interface BloodPressureUpsertRequest {
  systolic: number
  diastolic: number
  heartRate?: number | null
  isComplete?: boolean
  date: string
}

export interface BloodGlucoseUpsertRequest {
  value: number
  timing: GlucoseTiming
  elapsed?: GlucoseElapsed | null
  date: string
}

export interface BloodMetricsResponse {
  isSuccess: boolean
  code: string
  message: string
  timestamp: string
}
