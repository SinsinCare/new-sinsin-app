import { discardMedicationPhotos } from "../services/medicationPhotoCache"
import { create } from "zustand"
import type {
  CandidateMatch,
  Drug,
  Plan,
  RecognitionConfidence,
  Slot,
} from "../types"
import { todayKst } from "../data/medicationModel"
interface FlowState {
  date: string
  drug: Drug | null
  editing: Plan | null
  name: string
  source: "MANUAL" | "CATALOG" | "PHOTO"
  addedSlot: Slot | null
  addedId: string | null
  photos: { uri: string }[]
  candidates: Drug[]
  matches: CandidateMatch[]
  confidence: RecognitionConfidence
  start: (date: string) => void
  select: (
    drug: Drug | null,
    source?: "CATALOG" | "PHOTO",
    name?: string,
  ) => void
  edit: (plan: Plan) => void
  added: (plan: Plan) => void
  clearAdded: () => void
  setPhotos: (photos: { uri: string }[]) => void
  setCandidates: (
    candidates: Drug[],
    matches?: CandidateMatch[],
    confidence?: RecognitionConfidence,
  ) => void
  clear: () => void
}
const initial = () => ({
  date: todayKst(),
  drug: null,
  editing: null,
  name: "",
  source: "MANUAL" as const,
  addedSlot: null,
  addedId: null,
  photos: [],
  candidates: [],
  matches: [],
  confidence: "none" as const,
})
export const useMedicationFlowStore = create<FlowState>((set, get) => ({
  ...initial(),
  start: (date) => {
    discardMedicationPhotos(get().photos)
    set({ ...initial(), date })
  },
  select: (drug, source = "CATALOG", name = "") =>
    set({
      drug,
      source: drug ? source : "MANUAL",
      editing: null,
      name: drug?.name ?? name,
    }),
  edit: (editing) =>
    set({
      editing,
      drug: editing.drug,
      name: editing.name,
      source: editing.source,
    }),
  added: (plan) => {
    discardMedicationPhotos(get().photos)
    set({
      addedSlot: plan.slots[0] ?? null,
      addedId: plan.id,
      editing: null,
      photos: [],
      candidates: [],
      matches: [],
      confidence: "none",
    })
  },
  clearAdded: () => set({ addedSlot: null, addedId: null }),
  setPhotos: (photos) => {
    discardMedicationPhotos(
      get().photos.filter((old) => !photos.some((p) => p.uri === old.uri)),
    )
    set({ photos })
  },
  setCandidates: (candidates, matches = [], confidence = "none") =>
    set({ candidates, matches, confidence }),
  clear: () => {
    discardMedicationPhotos(get().photos)
    set(initial())
  },
}))
