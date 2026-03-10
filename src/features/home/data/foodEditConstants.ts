export const EATEN_STEPS = [
  "조금 먹었어요",
  "반 정도",
  "3/4",
  "다 먹었어요",
] as const

export const UNIT_OPTIONS = ["인분", "g", "개", "잔"] as const

export type UnitOption = (typeof UNIT_OPTIONS)[number]

export const THUMB_SIZE = 22
