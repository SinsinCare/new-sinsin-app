import type {
  GlucoseElapsed,
  GlucoseSlot,
  GlucoseTiming,
} from "@/src/features/home/data/bloodMetricsConstants"

export interface BloodPressureUpsertRequest {
  systolic: number
  diastolic: number
  heartRate?: number | null
  date: string
}

export interface BloodGlucoseUpsertRequest {
  value: number
  timing: GlucoseTiming
  elapsed?: GlucoseElapsed | null
  /**
   * 끼니. 공복에는 **싣지 않는다** — 서버가 400 으로 막는다(그 값이 무엇을 뜻하는지
   * 답할 수 없기 때문이다). 식전/식후에서만 보낸다.
   */
  slot?: Exclude<GlucoseSlot, ""> | null
  date: string
}

export interface BloodMetricsResponse {
  isSuccess: boolean
  code: string
  message: string
  timestamp: string
}

/** `GET /blood-glucose-records` 의 한 건. 통계 추이선이 쓴다. */
export interface BloodGlucoseRangeRecord {
  recordDate: string
  /** 끼니. 축이 생기기 전 기록과 구버전 앱이 남긴 기록은 `""` 다. */
  slot: GlucoseSlot
  timing: GlucoseTiming
  elapsed: GlucoseElapsed | null
  value: number
}

export interface BloodGlucoseRangeResponse {
  isSuccess: boolean
  code: string
  message: string
  result: { records: BloodGlucoseRangeRecord[] } | null
  timestamp: string
}
