import type { HealthCheckResultDetailRs } from "@/src/types/nhis"

export type MetricStatus = "normal" | "caution" | "warning"

/** 상태별 색상 (점/배지/텍스트) */
export const STATUS_COLORS: Record<
  MetricStatus,
  { dot: string; text: string; bg: string; label: string }
> = {
  normal: { dot: "#34D399", text: "#0D896A", bg: "#F0FDF4", label: "정상" },
  caution: { dot: "#F59E0B", text: "#B45309", bg: "#FFFBEB", label: "주의" },
  warning: { dot: "#EF4444", text: "#B91C1C", bg: "#FEF2F2", label: "경고" },
}

export interface MetricConfig {
  /** NHIS 상세 응답의 필드 키 */
  key: keyof HealthCheckResultDetailRs
  label: string
  unit: string
  /** 차트에 표시할 정상 범위 (밴드). 한쪽만 있으면 "이상/이하" */
  normalMin?: number
  normalMax?: number
  /** 측정값 → 상태 판정 */
  evaluate: (v: number) => MetricStatus
}

export interface ModuleConfig {
  id: string
  title: string
  /** Ionicons 이름 */
  icon: string
  accent: string
  description: string
  metrics: MetricConfig[]
}

/** 정상/주의 범위 기반 판정기 생성 */
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
    title: "신장",
    icon: "water-outline",
    accent: "#0D896A",
    description: "신사구체 여과율과 크레아티닌으로 신장 기능을 봅니다.",
    metrics: [
      {
        key: "gfr",
        label: "신사구체 여과율 (GFR)",
        unit: "mL/min",
        normalMin: 60,
        evaluate: higherBetter(60, 30),
      },
      {
        key: "serumCreatinine",
        label: "혈청 크레아티닌",
        unit: "mg/dL",
        normalMin: 0.5,
        normalMax: 1.2,
        evaluate: band(0.5, 1.2, 0.4, 1.5),
      },
    ],
  },
  {
    id: "electrolyte",
    title: "전해질",
    icon: "flask-outline",
    accent: "#2563EB",
    description: "나트륨·칼륨 등 전해질 균형 (검진 항목 연동 예정)",
    metrics: [],
  },
  {
    id: "proteinuria",
    title: "단백뇨",
    icon: "beaker-outline",
    accent: "#9333EA",
    description: "요단백 배출 정도 (검진 항목 연동 예정)",
    metrics: [],
  },
  {
    id: "bloodPressure",
    title: "혈압",
    icon: "pulse-outline",
    accent: "#DB2777",
    description: "수축기·이완기 혈압",
    metrics: [
      {
        key: "bloodPressureSystolic",
        label: "수축기 혈압",
        unit: "mmHg",
        normalMin: 90,
        normalMax: 120,
        evaluate: band(90, 120, 90, 139),
      },
      {
        key: "bloodPressureDiastolic",
        label: "이완기 혈압",
        unit: "mmHg",
        normalMin: 60,
        normalMax: 80,
        evaluate: band(60, 80, 60, 89),
      },
    ],
  },
  {
    id: "bloodSugar",
    title: "혈당",
    icon: "nutrition-outline",
    accent: "#EA580C",
    description: "공복 혈당",
    metrics: [
      {
        key: "fastingBloodSugar",
        label: "공복 혈당",
        unit: "mg/dL",
        normalMin: 70,
        normalMax: 99,
        evaluate: band(70, 99, 70, 125),
      },
    ],
  },
  {
    id: "lipid",
    title: "지질",
    icon: "ellipse-outline",
    accent: "#CA8A04",
    description: "콜레스테롤·중성지방",
    metrics: [
      {
        key: "totalCholesterol",
        label: "총 콜레스테롤",
        unit: "mg/dL",
        normalMax: 200,
        evaluate: lowerBetter(200, 239),
      },
      {
        key: "ldlCholesterol",
        label: "LDL 콜레스테롤",
        unit: "mg/dL",
        normalMax: 130,
        evaluate: lowerBetter(130, 159),
      },
      {
        key: "hdlCholesterol",
        label: "HDL 콜레스테롤",
        unit: "mg/dL",
        normalMin: 60,
        evaluate: higherBetter(60, 40),
      },
      {
        key: "triglyceride",
        label: "중성지방",
        unit: "mg/dL",
        normalMax: 150,
        evaluate: lowerBetter(150, 199),
      },
    ],
  },
  {
    id: "bloodLiver",
    title: "혈액·간",
    icon: "fitness-outline",
    accent: "#0891B2",
    description: "혈색소와 간 기능 수치",
    metrics: [
      {
        key: "hemoglobin",
        label: "혈색소",
        unit: "g/dL",
        normalMin: 12,
        normalMax: 17.5,
        evaluate: band(12, 17.5, 11, 19),
      },
      {
        key: "astSgot",
        label: "AST (SGOT)",
        unit: "U/L",
        normalMax: 40,
        evaluate: lowerBetter(40, 50),
      },
      {
        key: "altSgpt",
        label: "ALT (SGPT)",
        unit: "U/L",
        normalMax: 40,
        evaluate: lowerBetter(40, 50),
      },
      {
        key: "gammaGtp",
        label: "감마-GTP",
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

/** "2023.10.15" / "2023-10-15" → "23.10" */
export function formatShortDate(date: string): string {
  const digits = (date ?? "").replace(/[^0-9]/g, "")
  if (digits.length < 6) return date ?? ""
  return `${digits.slice(2, 4)}.${digits.slice(4, 6)}`
}

/** 정상 범위를 사람이 읽는 문구로 */
export function normalRangeText(config: MetricConfig): string {
  const { normalMin, normalMax } = config
  if (normalMin != null && normalMax != null)
    return `정상 ${normalMin}~${normalMax}`
  if (normalMin != null) return `정상 ${normalMin} 이상`
  if (normalMax != null) return `정상 ${normalMax} 이하`
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
): MetricSeries {
  const points: MetricPoint[] = []
  for (const d of ascendingDetails) {
    const value = parseValue(d[config.key] as string)
    if (value == null) continue
    points.push({
      date: d.checkupDate,
      label: formatShortDate(d.checkupDate),
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
