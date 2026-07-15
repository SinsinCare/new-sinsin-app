export const EATEN_PRESETS = [
  { step: 0, percentage: 25, label: "25%", description: "조금" },
  { step: 1, percentage: 50, label: "50%", description: "절반" },
  { step: 2, percentage: 75, label: "75%", description: "대부분" },
  { step: 3, percentage: 100, label: "100%", description: "전부" },
] as const

export const UNIT_OPTIONS = ["인분", "g", "개", "잔"] as const

export type UnitOption = (typeof UNIT_OPTIONS)[number]
