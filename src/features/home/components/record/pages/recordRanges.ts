/**
 * 혈당·혈압 기록 페이지의 **입력 중 판정**. 네이티브 의존이 없어 jest 가 검증한다
 * (`tests/recordRanges.test.ts`).
 *
 * ■ 무엇을 판정하나
 *
 * 사용자가 숫자를 치는 동안 "이 값이 정상인가, 어느 단계인가"를 배지 한 줄과 범위 바의
 * 마커로 보여준다(피드백 F3, 2026-09-11). 앱에는 이 판정을 하는 헬퍼가 없었다 —
 * 통계 리포트의 "목표 안이에요"는 서버 프로즈(`stats-report/types/report.ts`)라
 * 입력 중에는 쓸 수 없다. 그래서 문턱값을 여기 한 벌로 둔다.
 *
 * ■ 문턱값 (제품 오너가 F3 에서 준 값 그대로)
 *
 * 혈당 mg/dL
 *   공복(FASTING) · 식전(BEFORE_MEAL): <70 낮음 · 70–100 정상 · 100–125 주의 · ≥126 높음
 *   식후(AFTER_MEAL) · 미지정:          <70 낮음 · 70–180 정상(목표 90–180) · 180–200 주의 · >200 높음
 *   — 식전은 공복과 같은 띠로 둔다. 식전은 "지난 끼니에서 4시간 이상"이라 생리적으로 공복에
 *     가깝고, F3 는 식전 띠를 따로 주지 않았다. 70–90 은 식후 목표 아래지만 "낮음"도 아니라
 *     정상으로 판정한다(바에서는 목표 띠 밖으로 보인다).
 *
 * 혈압 mmHg
 *   최고: <90 낮음 · 90–120 정상 · 120–140 주의(높은 편) · ≥140 높음
 *   최저: <60 낮음 · 60–80 정상 · 80–90 주의 · ≥90 높음
 *   종합 = 둘 중 **나쁜 쪽** (낮음 < 정상 < 주의 < 높음 … 낮음도 정상보다 나쁘다).
 *
 * 경계값: **목표 띠는 양 끝을 포함한다** — 배지가 "목표 90–120" 이라고 말하면 120 은 목표
 * 안이어야 한다(식후 혈당 180 도 F3 가 "90–180 정상" 이라 정상). 그 위 경계는 F3 가 적은
 * 대로 "이상"(126·140·90 은 높음)이고, 식후 혈당만 "180–200 주의 · >200 높음" 이라 200 까지
 * 주의다.
 *
 * ■ 판정하지 않는 것
 *
 * 값이 비었거나 API 범위 밖(무효)이면 `null` — 배지도 마커도 그리지 않는다. 지어낸
 * 판정은 조용한 폴백이라 고장을 정상처럼 보이게 한다(`predictable-ux-over-fallbacks`).
 */

/** 낮음 → 정상 → 주의 → 높음. `severity` 는 "얼마나 나쁜가"의 순서다. */
export type RangeStatus = "low" | "normal" | "elevated" | "high"

const SEVERITY: Record<RangeStatus, number> = {
  normal: 0,
  low: 1,
  elevated: 2,
  high: 3,
}

/** 범위 바 한 벌 — 구간 경계와 바의 양 끝. 값은 모두 같은 단위. */
export interface RangeSpec {
  /** 바 왼쪽 끝. 낮음 구간이 보이도록 `low` 보다 조금 작다. */
  readonly min: number
  /** 바 오른쪽 끝. */
  readonly max: number
  /** 이 값 미만은 낮음. */
  readonly low: number
  /** 목표 띠의 시작(라벨 "목표 a–b"의 a). `low` 와 다를 수 있다(식후 혈당 70 vs 90). */
  readonly targetLow: number
  /** 목표 띠의 끝(포함). 이 값 초과는 주의. */
  readonly targetHigh: number
  /** 이 값부터 높음. `highExclusive` 가 참이면 이 값 초과부터 높음. */
  readonly high: number
  /** 참이면 `high` 는 "초과"(식후 혈당 200 은 주의). 기본은 "이상". */
  readonly highExclusive?: boolean
}

export const GLUCOSE_FASTING_RANGE: RangeSpec = {
  min: 40,
  max: 160,
  low: 70,
  targetLow: 70,
  targetHigh: 100,
  high: 126,
}

export const GLUCOSE_AFTER_MEAL_RANGE: RangeSpec = {
  min: 40,
  max: 250,
  low: 70,
  targetLow: 90,
  targetHigh: 180,
  high: 200,
  highExclusive: true,
}

export const SYSTOLIC_RANGE: RangeSpec = {
  min: 60,
  max: 160,
  low: 90,
  targetLow: 90,
  targetHigh: 120,
  high: 140,
}

export const DIASTOLIC_RANGE: RangeSpec = {
  min: 40,
  max: 110,
  low: 60,
  targetLow: 60,
  targetHigh: 80,
  high: 90,
}

export type GlucoseTimingLike = "FASTING" | "BEFORE_MEAL" | "AFTER_MEAL"

/** 혈당은 시점에 따라 띠가 다르다. 미지정(알 수 없는 값)은 식후 띠. */
export function glucoseRangeFor(
  timing: GlucoseTimingLike | string | null | undefined,
): RangeSpec {
  return timing === "FASTING" || timing === "BEFORE_MEAL"
    ? GLUCOSE_FASTING_RANGE
    : GLUCOSE_AFTER_MEAL_RANGE
}

/** 한 값의 구간. 값이 숫자가 아니면 `null`. */
export function classifyValue(
  value: number | null | undefined,
  range: RangeSpec,
): RangeStatus | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null
  }
  if (value < range.low) return "low"
  const isHigh = range.highExclusive ? value > range.high : value >= range.high
  if (isHigh) return "high"
  if (value > range.targetHigh) return "elevated"
  return "normal"
}

/** 최고·최저 중 나쁜 쪽. 하나라도 없으면 `null` — 반쪽 판정은 하지 않는다. */
export function worseStatus(
  a: RangeStatus | null,
  b: RangeStatus | null,
): RangeStatus | null {
  if (a === null || b === null) return null
  return SEVERITY[a] >= SEVERITY[b] ? a : b
}

export function classifyBloodPressure(
  systolic: number | null | undefined,
  diastolic: number | null | undefined,
): RangeStatus | null {
  return worseStatus(
    classifyValue(systolic, SYSTOLIC_RANGE),
    classifyValue(diastolic, DIASTOLIC_RANGE),
  )
}

/** 마커의 가로 위치(0–1). 바 밖의 값은 끝에 붙인다 — 바를 벗어나 그리지 않는다. */
export function rangePosition(value: number, range: RangeSpec): number {
  const ratio = (value - range.min) / (range.max - range.min)
  return Math.min(1, Math.max(0, ratio))
}

/** 세 자리 이하 정수 문자열만 값으로 친다. 페이지의 유효성 검사와 같은 규칙이다. */
export function parseReading(text: string): number | null {
  return /^\d{1,3}$/u.test(text) ? Number(text) : null
}
