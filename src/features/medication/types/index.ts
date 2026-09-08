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
export interface RecognitionResult {
  status: "candidates" | "no_match" | "poor_image" | "unavailable"
  items: Drug[]
}
