import type { HealthCheckResultDetailRs } from "@/src/types/nhis"
import type health from "@/src/i18n/locales/ko/health.json"
import type { TFunction } from "i18next"

export type MetricStatus = "normal" | "caution" | "warning"
type MetricLabelKey = keyof typeof health.dashboard.metrics
type ModuleTranslationKey = keyof typeof health.dashboard.modules

/** 검진 참고 범위와의 비교 상태. 진단이나 개인 치료 목표가 아니다. */
export const STATUS_COLORS: Record<
  MetricStatus,
  { dot: string; text: string; bg: string }
> = {
  normal: {
    dot: "#34D399",
    text: "#0D896A",
    bg: "#F0FDF4",
  },
  caution: {
    dot: "#F59E0B",
    text: "#B45309",
    bg: "#FFFBEB",
  },
  warning: {
    dot: "#EF4444",
    text: "#B91C1C",
    bg: "#FEF2F2",
  },
}

export interface MetricConfig {
  /** NHIS 상세 응답의 필드 키 */
  key: keyof HealthCheckResultDetailRs
  labelKey: MetricLabelKey
  unit: string
  /** 차트에 표시할 검진 참고 범위. 한쪽만 있으면 "이상/이하" */
  normalMin?: number
  normalMax?: number
  /** 측정값 → 상태 판정 */
  evaluate: (v: number) => MetricStatus
}

export interface ModuleConfig {
  id: string
  translationKey: ModuleTranslationKey
  /** Ionicons 이름 */
  icon: string
  accent: string
  metrics: MetricConfig[]
}

/** 로컬 검진 참고 범위와의 비교 상태를 만든다. */
function band(
  normalLow: number,
  normalHigh: number,
  cautionLow: number,
  cautionHigh: number,
): (v: number) => MetricStatus {
  return (v) => {
    if (v >= normalLow && v <= normalHigh) return "normal"
    if (v >= cautionLow && v <= cautionHigh) return "caution"
    return "warning"
  }
}

/** 높을수록 좋은 지표 (예: GFR, HDL) */
function higherBetter(
  normalMin: number,
  cautionMin: number,
): (v: number) => MetricStatus {
  return (v) => {
    if (v >= normalMin) return "normal"
    if (v >= cautionMin) return "caution"
    return "warning"
  }
}

/** 낮을수록 좋은 지표 (예: 콜레스테롤, 간수치) */
function lowerBetter(
  normalMax: number,
  cautionMax: number,
): (v: number) => MetricStatus {
  return (v) => {
    if (v <= normalMax) return "normal"
    if (v <= cautionMax) return "caution"
    return "warning"
  }
}

/**
 * 검사 대시보드 모듈 정의.
 * NHIS 일반검진 응답에 존재하는 항목은 실제 데이터로 채워지고,
 * 전해질·단백뇨처럼 응답에 없는 모듈은 metrics:[] 로 두어
 * "기록 없음" 카드로 표시된다. 백엔드가 해당 필드를 추가하면
 * metrics 에 한 줄만 추가하면 자동으로 추세 차트가 그려진다.
 */
export const DASHBOARD_MODULES: ModuleConfig[] = [
  {
    id: "kidney",
    translationKey: "kidney",
    icon: "water-outline",
    accent: "#0D896A",
    metrics: [
      {
        key: "gfr",
        labelKey: "gfr",
        unit: "mL/min",
        normalMin: 60,
        evaluate: higherBetter(60, 30),
      },
      {
        key: "serumCreatinine",
        labelKey: "serumCreatinine",
        unit: "mg/dL",
        normalMin: 0.5,
        normalMax: 1.2,
        evaluate: band(0.5, 1.2, 0.4, 1.5),
      },
    ],
  },
  {
    id: "electrolyte",
    translationKey: "electrolytes",
    icon: "flask-outline",
    accent: "#2563EB",
    metrics: [],
  },
  {
    id: "proteinuria",
    translationKey: "proteinuria",
    icon: "beaker-outline",
    accent: "#9333EA",
    metrics: [],
  },
  {
    id: "bloodPressure",
    translationKey: "bloodPressure",
    icon: "pulse-outline",
    accent: "#DB2777",
    metrics: [
      {
        key: "bloodPressureSystolic",
        labelKey: "systolicBloodPressure",
        unit: "mmHg",
        normalMin: 90,
        normalMax: 120,
        evaluate: band(90, 120, 90, 139),
      },
      {
        key: "bloodPressureDiastolic",
        labelKey: "diastolicBloodPressure",
        unit: "mmHg",
        normalMin: 60,
        normalMax: 80,
        evaluate: band(60, 80, 60, 89),
      },
    ],
  },
  {
    id: "bloodSugar",
    translationKey: "bloodGlucose",
    icon: "nutrition-outline",
    accent: "#EA580C",
    metrics: [
      {
        key: "fastingBloodSugar",
        labelKey: "fastingBloodGlucose",
        unit: "mg/dL",
        normalMin: 70,
        normalMax: 99,
        evaluate: band(70, 99, 70, 125),
      },
    ],
  },
  {
    id: "lipid",
    translationKey: "lipids",
    icon: "ellipse-outline",
    accent: "#CA8A04",
    metrics: [
      {
        key: "totalCholesterol",
        labelKey: "totalCholesterol",
        unit: "mg/dL",
        normalMax: 200,
        evaluate: lowerBetter(200, 239),
      },
      {
        key: "ldlCholesterol",
        labelKey: "ldlCholesterol",
        unit: "mg/dL",
        normalMax: 130,
        evaluate: lowerBetter(130, 159),
      },
      {
        key: "hdlCholesterol",
        labelKey: "hdlCholesterol",
        unit: "mg/dL",
        normalMin: 60,
        evaluate: higherBetter(60, 40),
      },
      {
        key: "triglyceride",
        labelKey: "triglycerides",
        unit: "mg/dL",
        normalMax: 150,
        evaluate: lowerBetter(150, 199),
      },
    ],
  },
  {
    id: "bloodLiver",
    translationKey: "bloodLiver",
    icon: "fitness-outline",
    accent: "#0891B2",
    metrics: [
      {
        key: "hemoglobin",
        labelKey: "hemoglobin",
        unit: "g/dL",
        normalMin: 12,
        normalMax: 17.5,
        evaluate: band(12, 17.5, 11, 19),
      },
      {
        key: "astSgot",
        labelKey: "ast",
        unit: "U/L",
        normalMax: 40,
        evaluate: lowerBetter(40, 50),
      },
      {
        key: "altSgpt",
        labelKey: "alt",
        unit: "U/L",
        normalMax: 40,
        evaluate: lowerBetter(40, 50),
      },
      {
        key: "gammaGtp",
        labelKey: "gammaGtp",
        unit: "U/L",
        normalMax: 63,
        evaluate: lowerBetter(63, 77),
      },
    ],
  },
]

export interface MetricPoint {
  date: string
  label: string
  value: number
  status: MetricStatus
}

export interface MetricSeries {
  config: MetricConfig
  points: MetricPoint[]
  latest?: MetricPoint
}

function parseHealthDate(date: string): Date | null {
  const digits = (date ?? "").replace(/[^0-9]/g, "")
  if (digits.length < 8) return null
  const year = Number(digits.slice(0, 4))
  const month = Number(digits.slice(4, 6))
  const day = Number(digits.slice(6, 8))
  const parsed = new Date(year, month - 1, day)
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null
  }
  return parsed
}

export function formatHealthDate(date: string, language: string): string {
  const parsed = parseHealthDate(date)
  if (!parsed) return date ?? ""
  return new Intl.DateTimeFormat(
    language.toLowerCase().startsWith("en") ? "en-US" : "ko-KR",
    { year: "numeric", month: "short", day: "numeric" },
  ).format(parsed)
}

/** Compact chart label in the selected app language. */
export function formatShortDate(date: string, language = "ko"): string {
  const parsed = parseHealthDate(date)
  if (!parsed) return date ?? ""
  return new Intl.DateTimeFormat(
    language.toLowerCase().startsWith("en") ? "en-US" : "ko-KR",
    { year: "2-digit", month: "short" },
  ).format(parsed)
}

/** 앱의 일반 참고 구간을 검진기관 판정과 구분해 보여 준다. */
export function normalRangeText(
  config: MetricConfig,
  t: TFunction<"health">,
): string {
  const { normalMin, normalMax } = config
  if (normalMin != null && normalMax != null)
    return t("dashboard.referenceRangeBetween", {
      min: normalMin,
      max: normalMax,
    })
  if (normalMin != null)
    return t("dashboard.referenceRangeMin", { min: normalMin })
  if (normalMax != null)
    return t("dashboard.referenceRangeMax", { max: normalMax })
  return ""
}

function parseValue(raw: string | undefined): number | null {
  if (raw == null) return null
  const n = Number(String(raw).replace(/[^0-9.\-]/g, ""))
  return Number.isFinite(n) && String(raw).trim() !== "" ? n : null
}

/**
 * 날짜 오름차순(과거→현재)으로 정렬된 상세 결과 배열에서
 * 한 지표의 시계열을 만든다.
 */
export function buildSeries(
  config: MetricConfig,
  ascendingDetails: HealthCheckResultDetailRs[],
  language = "ko",
): MetricSeries {
  const points: MetricPoint[] = []
  for (const d of ascendingDetails) {
    const value = parseValue(d[config.key] as string)
    if (value == null) continue
    points.push({
      date: d.checkupDate,
      label: formatShortDate(d.checkupDate, language),
      value,
      status: config.evaluate(value),
    })
  }
  return { config, points, latest: points[points.length - 1] }
}

/** 여러 상태 중 가장 나쁜 것 */
export function worstStatus(statuses: MetricStatus[]): MetricStatus | null {
  if (statuses.includes("warning")) return "warning"
  if (statuses.includes("caution")) return "caution"
  if (statuses.includes("normal")) return "normal"
  return null
}
