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
  // 화면 참고 범위 = 수축 90~119 그리고 이완 60~79.
  const normal =
    systolic >= 90 && systolic < 120 && diastolic >= 60 && diastolic < 80
  return normal ? "normal" : "caution"
}

export function judgeGlucose(
  value: number | null,
  timing: GlucoseTiming,
): VitalStatus {
  if (value === null) return "none"
  const { min, max } = getGlucoseTarget(timing)
  return value >= min && value <= max ? "normal" : "caution"
}

/**
 * 목표 구간 — 시트의 구간 바가 그리는 값. 판정 함수와 같은 숫자를 쓴다.
 * 화면이 제 나름의 기준을 다시 만들면 배지와 바가 서로 다른 말을 한다.
 *
 * 여기 값은 통용 교육 자료 기준이며, 서비스 적재 전 의학 자문 검수 대상이다.
 */
export const GLUCOSE_RANGE = { min: 70, max: 250 } as const
/** 이 위부터 빠른 확인 구간(바의 레드 면). */
export const GLUCOSE_DANGER_FROM = 200

export function getGlucoseTarget(timing: GlucoseTiming): {
  min: number
  max: number
} {
  // 식후 90–180 은 홈 시트 시안(2026-08-03)의 값이다. 식전·공복은 기존 70–99 유지.
  return timing === "AFTER_MEAL" ? { min: 90, max: 180 } : { min: 70, max: 99 }
}

export const BLOOD_PRESSURE_RANGE = { min: 90, max: 160 } as const
export const BLOOD_PRESSURE_TARGET = { min: 90, max: 120 } as const
/** 수축 140 또는 이완 90부터 빠른 확인 — 바와 배지가 같은 숫자를 본다. */
export const BLOOD_PRESSURE_DANGER = { systolic: 140, diastolic: 90 } as const

export type DetailedVitalStatus = "normal" | "caution" | "danger" | "none"

/** 판정 상태의 사용자 라벨. 색 없이 글자만으로도 읽혀야 한다. */
export const JUDGMENT_TEXT: Record<
  Exclude<DetailedVitalStatus, "none">,
  string
> = {
  normal: "참고 범위 안",
  caution: "참고 범위 밖",
  danger: "빠른 확인",
}

/**
 * 3단 표시. 참고 범위 안·밖은 기존 judgeBloodPressure 와 같고,
 * 빠른 확인(수축 140+ 또는 이완 90+)만 한 단계 더 가른다.
 */
export function judgeBloodPressureDetailed(
  systolic: number | null,
  diastolic: number | null,
): DetailedVitalStatus {
  const base = judgeBloodPressure(systolic, diastolic)
  if (base === "none") return "none"
  if (
    (systolic !== null && systolic >= BLOOD_PRESSURE_DANGER.systolic) ||
    (diastolic !== null && diastolic >= BLOOD_PRESSURE_DANGER.diastolic)
  ) {
    return "danger"
  }
  return base
}

export function judgeGlucoseDetailed(
  value: number | null,
  timing: GlucoseTiming,
): DetailedVitalStatus {
  const base = judgeGlucose(value, timing)
  if (base === "none") return "none"
  if (value !== null && value >= GLUCOSE_DANGER_FROM) return "danger"
  return base
}

/**
 * 시트 배지가 쓰는 판정 한 벌 — 톤(색)과 방향(높음/낮음)을 함께 준다.
 * "주의" 한 단어보다 "높음/낮음"이 다음 행동(재측정·기록 후 상담)을 정한다.
 * 라벨 문자열은 화면이 i18n 으로 그린다(`home.sheet.judgment.*`).
 */
export interface VitalJudgment {
  tone: "normal" | "caution" | "danger"
  direction: "in" | "high" | "low"
}

export function judgeGlucoseValue(
  value: number | null,
  timing: GlucoseTiming,
): VitalJudgment | null {
  if (value === null) return null
  const { min, max } = getGlucoseTarget(timing)
  if (value >= GLUCOSE_DANGER_FROM) return { tone: "danger", direction: "high" }
  if (value > max) return { tone: "caution", direction: "high" }
  if (value < min) return { tone: "caution", direction: "low" }
  return { tone: "normal", direction: "in" }
}

export function judgeBloodPressureValue(
  systolic: number | null,
  diastolic: number | null,
): VitalJudgment | null {
  if (systolic === null || diastolic === null) return null
  if (
    systolic >= BLOOD_PRESSURE_DANGER.systolic ||
    diastolic >= BLOOD_PRESSURE_DANGER.diastolic
  ) {
    return { tone: "danger", direction: "high" }
  }
  if (systolic < 90 || diastolic < 60)
    return { tone: "caution", direction: "low" }
  if (systolic >= 120 || diastolic >= 80)
    return { tone: "caution", direction: "high" }
  return { tone: "normal", direction: "in" }
}
