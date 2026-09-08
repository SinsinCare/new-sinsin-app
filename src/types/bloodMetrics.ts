import type {
  GlucoseElapsed,
  GlucoseSlot,
  GlucoseTiming,
} from "@/src/features/home/data/bloodMetricsConstants"

/**
 * 혈압의 끼니 축(마이그레이션 093). 혈당과 같은 규칙이되 **취침 전**이 하나 더 있다 —
 * 가정혈압은 아침·저녁 측정이 정론이고 취침 전 측정도 흔하다. `""` 는 축이 생기기 전
 * 기록과 구버전 앱이 남긴 칸이다.
 */
export type BloodPressureSlot = "BREAKFAST" | "LUNCH" | "DINNER" | "BEDTIME" | ""

export const BLOOD_PRESSURE_SLOT_OPTIONS: Exclude<BloodPressureSlot, "">[] = [
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "BEDTIME",
]

/** 시점 축(마이그레이션 093). 취침 전은 식사와 무관해 `""` 다. */
export type BloodPressureTiming =
  | "FASTING"
  | "BEFORE_MEAL"
  | "AFTER_MEAL_1H"
  | "AFTER_MEAL_2H"
  | ""

export const BLOOD_PRESSURE_TIMING_OPTIONS: Exclude<BloodPressureTiming, "">[] = [
  "FASTING",
  "BEFORE_MEAL",
  "AFTER_MEAL_1H",
  "AFTER_MEAL_2H",
]

export interface BloodPressureUpsertRequest {
  systolic: number
  diastolic: number
  heartRate?: number | null
  /** 끼니. 취침 전이면 `timing` 을 싣지 않는다 — 서버가 400 으로 막는다. */
  slot?: Exclude<BloodPressureSlot, ""> | null
  /** 시점. 끼니 없이 이것만 보내면 서버가 400 으로 막는다. */
  timing?: Exclude<BloodPressureTiming, ""> | null
  date: string
}

/** `GET /blood-pressure-records` 의 한 건. 기록 페이지의 이력 표가 쓴다. */
export interface BloodPressureRangeRecord {
  recordDate: string
  slot: BloodPressureSlot
  timing: BloodPressureTiming
  systolic: number
  diastolic: number
  heartRate: number | null
  /** 측정 시각(서버 naive UTC). 093 이전 기록은 null — 모르는 것을 0시로 적지 않는다. */
  recordedAt: string | null
}

export interface BloodPressureRangeResponse {
  isSuccess: boolean
  code: string
  message: string
  result: { records: BloodPressureRangeRecord[] } | null
  timestamp: string
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
