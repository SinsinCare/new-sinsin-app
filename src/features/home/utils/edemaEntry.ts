import type { EdemaLevel } from "../data/EdemaConstants"

export const EDEMA_PARTS = [
  "FACE",
  "EYELIDS",
  "HANDS",
  "CALVES",
  "ANKLES",
  "FEET",
] as const
export type EdemaPart = (typeof EDEMA_PARTS)[number]
export interface EdemaObservation {
  part: EdemaPart
  level: EdemaLevel
  pitting: boolean | null
}
export interface EdemaEntry {
  edemaLevel: EdemaLevel
  observations: EdemaObservation[]
}

/** The daily tile retains the strongest self-reported level; never infer it from pitting. */
export function edemaEntry(observations: EdemaObservation[]): EdemaEntry {
  const clean = EDEMA_PARTS.flatMap((part) => {
    const item = observations.find((value) => value.part === part)
    return item
      ? [{ ...item, pitting: item.level === "NONE" ? null : item.pitting }]
      : []
  })
  return {
    edemaLevel: clean.some((item) => item.level === "SEVERE")
      ? "SEVERE"
      : clean.some((item) => item.level === "SLIGHT")
        ? "SLIGHT"
        : "NONE",
    observations: clean,
  }
}
