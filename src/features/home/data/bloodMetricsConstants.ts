export type GlucoseTiming = "FASTING" | "BEFORE_MEAL" | "AFTER_MEAL"

export const GLUCOSE_TIMING_OPTIONS: GlucoseTiming[] = [
  "FASTING",
  "BEFORE_MEAL",
  "AFTER_MEAL",
]

export const GLUCOSE_TIMING_LABEL: Record<GlucoseTiming, string> = {
  FASTING: "공복",
  BEFORE_MEAL: "식전",
  AFTER_MEAL: "식후",
}

export type GlucoseElapsed = "30M" | "1H" | "2H"

export const GLUCOSE_ELAPSED_OPTIONS: GlucoseElapsed[] = ["30M", "1H", "2H"]

export const GLUCOSE_ELAPSED_LABEL: Record<GlucoseElapsed, string> = {
  "30M": "30분",
  "1H": "1시간",
  "2H": "2시간",
}

// Default placeholder values shown when no record exists yet
export const BP_PLACEHOLDER = {
  systolic: "100",
  diastolic: "80",
  heartRate: "60",
}
export const GLUCOSE_PLACEHOLDER = "100"

export const VITAL_STATUS_LABEL = {
  normal: "정상",
  caution: "주의",
  none: "----",
} as const
