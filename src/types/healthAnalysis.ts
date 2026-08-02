/**
 * 건강검진 분석 API 계약 (`POST /health-check/analysis`).
 *
 * 판정(정상/주의/위험)은 원래 앱에만 있었다 — `src/features/health/data/dashboardMetrics.ts`
 * 의 352줄. 그래서 기준을 한 줄 바꾸려면 앱 배포가 필요했고, 같은 데이터를 보는 의사 쪽은
 * 상태를 아예 볼 수 없었다. 이제 서버가 같은 임계값으로 판정해서 내려 준다.
 *
 * `dashboardMetrics.ts` 는 아직 남아 있다(구 대시보드가 쓴다). 두 곳의 임계값이 갈리면
 * 같은 수치가 화면마다 다른 색으로 보인다 — 한쪽을 고치면 반드시 다른 쪽도 고쳐야 한다.
 */

export type MetricStatus = "normal" | "caution" | "warning"

/**
 * 문장을 조각으로 나눠 받는 이유.
 *
 * 디자인이 AI 요약 문장 **안의 특정 구절**에만 형광 하이라이트를 칠한다
 * ("크레아티닌 수치는 정상범위이나, <mark>사구체 여과율(eGFR)이 낮아</mark> 주의가 필요합니다").
 * 이걸 문자 오프셋(start/end)으로 주면 ko→en 로 갈 때 반드시 어긋난다 — 번역문의 길이가
 * 다르기 때문이다. 조각 배열은 언어가 바뀌어도 어긋날 수가 없다.
 */
export interface ProseSegment {
  text: string
  emphasis: boolean
}

export interface AnalysisSummary {
  segments: ProseSegment[]
  /**
   * "AI" | "FALLBACK".
   *
   * FALLBACK 은 LLM 호출이 실패·미설정·타임아웃일 때 서버가 규칙으로 만든 문장이다.
   * 통계 리포트에서는 이 값을 화면에 전혀 드러내지 않아서 결정적 문장과 AI 문장이
   * 구분되지 않는 문제가 있었다. 여기서는 최소한 값을 받아 두고, 노출 여부는 화면이 정한다.
   */
  source: "AI" | "FALLBACK"
}

export interface AnalysisCounts {
  warning: number
  caution: number
  normal: number
}

/** 검진 1회의 지표 1개. */
export interface AnalysisMetric {
  key: string
  label: string
  value: number
  unit: string
  status: MetricStatus
  /** "60 이상", "0.5~1.2" 처럼 사람이 읽는 참고범위. 진단 기준이 아니라 비교 기준이다. */
  referenceText: string
  resultId: number
  checkupDate: string
}

export interface TimelineItem {
  key: string
  label: string
  value: number
  unit: string
  status: MetricStatus
  /** 같은 지표의 직전 검진 대비 변화량. 이전 값이 없으면 null. */
  delta: number | null
  deltaDirection: "up" | "down" | null
}

export interface TimelineEntry {
  date: string
  isLatest: boolean
  items: TimelineItem[]
}

/** 월별 캘린더의 하루. 그 날짜에 잡힌 상태별 개수. */
export interface CalendarDay {
  date: string
  warning: number
  caution: number
  normal: number
}

export interface HealthAnalysis {
  counts: AnalysisCounts
  summary: AnalysisSummary
  /** 검진이 2회 미만이면 추세를 말할 수 없으므로 null. */
  trendInsight: { segments: ProseSegment[] } | null
  metrics: AnalysisMetric[]
  timeline: TimelineEntry[]
  calendar: CalendarDay[]
}

export interface HealthAnalysisRequest {
  resultIds: number[]
}

/** 한 번에 분석할 수 있는 검진 수. 서버와 같은 값이어야 한다. */
export const MAX_ANALYSIS_RESULTS = 20
