/**
 * 통계 리포트 응답 계약.
 *
 * 키는 백엔드 `app/domain/statsreport/facts.py` 가 만드는 JSON(camelCase)을
 * 그대로 따른다. **여기서 숫자를 다시 만들지 않는다** — `remainLine` 같은
 * 표시용 문자열까지 서버가 만들어 보낸다. 화면이 자기 식대로 반올림하면
 * 결론 헤드라인과 표의 숫자가 어긋난다.
 *
 * 렌더 규칙(계약): null 인 섹션은 그리지 않는다. 지표 카드는
 * 값 + 기간·시각 + 해석 문장 3요소가 전부 있을 때만 서버가 내려준다.
 */

/** 리포트 기간 단위 */
export type PeriodType = "day" | "week" | "month"

/** 기록률 신뢰도. >=80 HIGH, >=50 MEDIUM, 그 외 LOW */
export type ReliabilityLevel = "HIGH" | "MEDIUM" | "LOW"

/**
 * 상태 배지 단계. GOOD("좋아요")·WORSE("악화")는 월간 방향 판정 전용이고
 * 나머지는 공용이다. 색 규칙은 components/StatusBadge.tsx 한 곳에서만 정한다.
 */
export type BadgeLevel =
  | "OK"
  | "CAUTION"
  | "DANGER"
  | "LOW_DATA"
  | "GOOD"
  | "WORSE"

/** 결론 프로즈 출처 — AI 실패 시 결정론 폴백 */
export type ConclusionSource = "AI" | "FALLBACK"

/** 기간 내 기록률 — 결론 강도와 '기록 부족' 안내의 근거 */
export interface StatsReliability {
  /** 기간 내 실제 기록된 끼니 수 */
  mealsRecorded: number
  /** 기간 내 기대 끼니 수(하루 3끼 기준) */
  mealsExpected: number
  /** 기록률 %(0~100, 서버가 반올림) */
  ratePercent: number
  /** 기록률 등급. LOW 면 결론 badge 가 "기록 부족"으로 내려온다 */
  level: ReliabilityLevel
}

/** 결론 카드 — 프로즈는 에이전트, 판정은 알고리즘이 만든다 */
export interface StatsConclusion {
  /** "오늘 확인 1건" 같은 확인 건수 배지. 기록 부족이면 "기록 부족" */
  badge: string
  /** 한 줄 결론. 숫자는 서버가 박아 보낸 문자열 그대로 */
  headline: string
  /** 결론의 근거 문장 */
  support: string
  /** 지금 할 일 한 가지 */
  action: string
  /** 할 일의 보조 설명 */
  actionCaption: string
  /** AI 프로즈인지 결정론 폴백인지 */
  source: ConclusionSource
}

/** 겹친 신호 한 줄 */
export interface OverlapSignal {
  /** "칼륨 4,800mg" 같은 신호 요약 */
  label: string
  /** "제한보다 1,800 많음" 같은 부연 */
  detail: string
}

/** 일간 전용 — 신호가 2개 이상 겹칠 때만 non-null */
export interface OverlapSignals {
  /** 섹션 타이틀("따로 보면 안 보여요") */
  title: string
  /** 겹친 신호 요약 한 줄 */
  headline: string
  /** 겹친 신호 목록(2개 이상) */
  signals: OverlapSignal[]
  /** 안전 가드 노트 — 사용자가 직접 취할 다음 행동 */
  note: string
}

/** 혈압이 참고 목표 안인 날이 3일 이상 이어질 때 노출되는 복용 변경 주의 카드 */
export interface MaintainCard {
  /** "약은 그대로" */
  title: string
  headline: string
  body: string
  /** 처방 금지 고지("이 앱은 약을 늘리거나 줄이라고 말하지 않아요...") */
  footer: string
}

/** 일간 남은 양 표의 한 행. 한도 모르는 영양소는 서버가 행을 제외한다 */
export interface NutrientRemainRow {
  /** "potassium" 같은 영양소 키 */
  key: string
  /** "칼륨" 같은 표시 라벨 */
  label: string
  /**
   * 칼륨·인처럼 혈청 수치 없이는 단정할 수 없는 쪽인지(화면 표기는 "권장량", 2026-09-03).
   * 이런 영양소는 단정 대신 "권장량" 톤으로 말한다(기존 식사 리포트와 동일).
   */
  isReference: boolean
  badgeLevel: BadgeLevel
  /** "초과" | "주의" | "여유" */
  badgeLabel: string
  /** 섭취량 표시 문자열("4,800") */
  valueText: string
  /** 한도 표시 문자열("3,000mg") */
  limitText: string
  /** "1,800mg 초과했어요 · 오늘 확인할 한 가지" 같은 해석 한 줄 */
  remainLine: string
}

/** 일간 '오늘 먹은 것' 한 행 — 분석 id 로 식사 리포트 딥링크 가능(1차는 표시만) */
export interface FoodRow {
  /** 식사 분석 결과 id */
  analysisId: number
  /** "샐러드와 오리고기" 같은 끼니 이름 */
  title: string
  /** "12:30" 기록 시각 */
  timeText: string
  /** "칼륨 2,300mg" 같은 대표 지표 */
  metricText: string
  badgeLevel: BadgeLevel
  /** "칼륨 많음" | "기준 안" 등 */
  badgeLabel: string
}

/** 일간 '오늘의 수치' 한 행 — 값+시각+해석 3요소를 갖춘 것만 내려온다 */
export interface VitalRow {
  key: "bloodPressure" | "bloodGlucose" | "weightEdema" | "water" | "calories"
  /** "혈압" 같은 표시 라벨 */
  label: string
  /** "128/82" 같은 값 문자열 */
  valueText: string
  /** "mmHg" 같은 단위 */
  unit: string
  badgeLevel: BadgeLevel
  /** "기준 안" 등 */
  badgeLabel: string
  /** "08:30 측정 · 3일째 목표 안이에요..." — 측정 시각 포함 해석 */
  interpret: string
}

/** 주간 바 차트의 하루 칸 */
export interface WeekChartDay {
  /** 날짜 숫자(18 = 18일). 바 아래에 그대로 쓴다 */
  day: number
  /** 한도 대비 비율(0~1대. 화면에서 1로 클램프해 그린다) */
  ratio: number
  /** 제한 초과일 — 이 칸만 danger 로 칠한다 */
  over: boolean
  /** 기록 없는 날 — 바 없이 빈 칸(테두리만) */
  empty: boolean
}

/** 주간 영양소 차트(칼륨) */
export interface WeekNutrientChart {
  /** "제한 3,000mg 기준" */
  limitText: string
  /** 월요일 시작 7칸 */
  days: WeekChartDay[]
  /** 차트 밑 해석("붉은 칸이 제한을 넘긴 날... 지난주 1일 → 이번 주 3일") */
  caption: string
}

/** 주간 체중 추세 차트 */
export interface WeekWeightChart {
  /** 기준선 설명. 없으면 null */
  baselineText: string | null
  /** 월요일 시작 7칸 */
  days: WeekChartDay[]
  /** "+1.2" — 첫 기록 대비 변화량 */
  deltaText: string
  /** "kg · 18일 대비" — 단위와 비교 기준 */
  deltaUnit: string
  /** 변화량의 판정 톤 */
  badgeLevel: BadgeLevel
  caption: string
}

/** 주간 전용 차트 묶음. 데이터가 모자란 차트는 null 로 빠질 수 있다 */
export interface WeekCharts {
  potassium: WeekNutrientChart | null
  weight: WeekWeightChart | null
}

/** 주간·월간 지표 리스트 한 행(3요소 규칙을 서버가 보장) */
export interface AverageRow {
  /** "bloodPressure" 같은 지표 키 */
  key: string
  /** "혈압" 같은 표시 라벨 */
  label: string
  /** "126/80" 같은 값 문자열 */
  valueText: string
  /** "mmHg 평균" 같은 단위 문자열 */
  unit: string
  /** 월간만: 지난달 대비("+420"). 일·주간은 null */
  deltaText: string | null
  badgeLevel: BadgeLevel
  /** "기준 안" | "확인 필요" | "빠른 확인" | "기록 부족" | "줄어듦" | "늘어남" */
  badgeLabel: string
  /** "7일 중 5일 목표 안..." — 판정 단위 언어(평균으로 판정하지 않는다) */
  interpret: string
}

/** 월간 주별 비교의 한 주 */
export interface WeeklyCompareWeek {
  /** "1주" */
  label: string
  /** 그 주의 제한 초과일 수 */
  overDays: number
  /** 그 주가 며칠짜리인지(월 경계 주는 7 미만) */
  daysInWeek: number
  /** "-0.2kg" — 그 주의 체중 변화. 기록 없으면 null */
  weightDeltaText: string | null
}

/** 월간 전용 주별 비교 */
export interface WeeklyCompare {
  /** "주별 비교" */
  title: string
  /** "칼륨 초과일 · 체중 변화" */
  caption: string
  /** 월내 ISO 주 4~5개 */
  weeks: WeeklyCompareWeek[]
  /** "붉은 칸은 그 주에..." 읽는 법 안내 */
  note: string
}

/** `GET /statistics/report` 의 result */
export interface StatsReport {
  period: PeriodType
  /** 기간 시작일(YYYY-MM-DD) */
  startDate: string
  /** 기간 끝일(YYYY-MM-DD). day 는 startDate 와 같다 */
  endDate: string
  /** "7월 24일 금" / "7월 18일 – 24일" / "7월"(타년도면 "2025년 12월") */
  title: string
  reliability: StatsReliability
  conclusion: StatsConclusion
  /** 일간 전용. 신호 2개 이상 겹칠 때만 */
  overlapSignals: OverlapSignals | null
  /** 혈압 3일 연속 목표 안일 때만 */
  maintainCard: MaintainCard | null
  /** 일간 전용 남은 양 표. 주간·월간은 null */
  nutrients: NutrientRemainRow[] | null
  /** 남은 양 표 밑의 고지("하루 값 하나로는 판단하지 않아요...") */
  nutrientsFootnote: string | null
  /** 일간 '오늘 먹은 것' */
  foods: FoodRow[] | null
  /** 일간 '오늘의 수치' */
  vitals: VitalRow[] | null
  /** 주간 전용 */
  weekCharts: WeekCharts | null
  /** 주간·월간 지표 리스트 */
  averages: AverageRow[] | null
  /** 월간 전용 */
  weeklyCompare: WeeklyCompare | null
  /** 검사일 데이터가 아직 없어 항상 null — 렌더 규칙이 자연 배제한다 */
  clinicNote: null
  /** 의료 면책 고지. 항상 마지막에 그린다 */
  disclaimer: string
}
