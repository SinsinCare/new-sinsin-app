export const SLOTS = ["BREAKFAST", "LUNCH", "DINNER", "BEDTIME"] as const
export type Slot = (typeof SLOTS)[number]
export const TIMINGS = [
  "UNSPECIFIED",
  "BEFORE_30",
  "WITH_MEAL",
  "AFTER_IMMEDIATE",
  "AFTER_30",
] as const
export const UNITS = [
  "TABLET",
  "CAPSULE",
  "PACK",
  "ML",
  "DROP",
  "PUFF",
  "APPLICATION",
] as const
export type MedicationSource = "MANUAL" | "CATALOG" | "PHOTO"
export interface Drug {
  id: string
  name: string
  manufacturer: string
  ingredients: string
  category: string
  imageUrl: string | null
  shape: string
  color: string
  imprintFront: string
  imprintBack: string
  source: string
  sourceUrl: string
  updatedAt: string
  /** 전문의약품 | 일반의약품 | "". */
  etcOtc?: string
  /** 제형(필름코팅정·캡슐 …). 낱알식별 품목만 있다. */
  form?: string
  /** 낱알식별 정보가 있어 사진 인식 대상인 품목. */
  pill?: boolean
  /** e약은요 효능 원문. 화면은 `drugSummary()` 로 한 줄만 쓴다. */
  efficacy?: string
  usage?: string
  caution?: string
  guide?: {
    text: string
    reviewedBy: string
    reviewedAt: string
    sourceUrl: string
  }
}
export interface PlanInput {
  name: string
  slots: Slot[]
  dose: number
  unit: (typeof UNITS)[number]
  timing: (typeof TIMINGS)[number]
  reminder: boolean
  reminderTimes: Record<Slot, string>
  startDate: string
  source: MedicationSource
  drugId: string | null
}
export interface Plan extends PlanInput {
  id: string
  version: number
  status: "ACTIVE" | "PAUSED" | "ARCHIVED"
  drug: Drug | null
}
export interface DoseEntry {
  planId: string
  slot: Slot
  snapshot: Plan
  recordedAt: string
  timeKnown: boolean
}
export interface Occurrence {
  key: string
  planId: string
  slot: Slot
  plan: Plan
  taken: boolean
  recordedAt: string | null
  timeKnown: boolean
  historical: boolean
}
export interface MedicationDay {
  date: string
  today: string
  revision: string
  taken: number
  planned: number
  legacyTaken: number
  occurrences: Occurrence[]
  plans: Plan[]
}

export interface MedicationCapabilities {
  version: number
  catalog: boolean
  recognition: boolean
}
export interface DrugSearch {
  available: boolean
  source: string | null
  sourceUrl: string | null
  updatedAt: string | null
  items: Drug[]
}
export type RecognitionConfidence = "high" | "medium" | "low" | "none"
export interface CandidateMatch {
  id: string
  /** 0~100. 서버 §7-3 배점 그대로 — 화면은 부풀리거나 반올림해 100으로 만들지 않는다(RQ-44). */
  score: number
  parts: { imprint: number; appearance: number; context: number }
}
export interface ObservedFeatures {
  /** 사진에서 읽은 각인 토큰. 후보의 각인과 눈으로 대조하는 데 쓴다(RQ-45). */
  imprints: string[]
  shape: string
  colors: string[]
}
export interface RecognitionResult {
  status: "candidates" | "no_match" | "poor_image" | "unavailable"
  observed?: ObservedFeatures
  /** AC-15~17 분기. high 면 1순위를 강조·선택해 둔다. */
  confidence: RecognitionConfidence
  items: Drug[]
  matches: CandidateMatch[]
}
