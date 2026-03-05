export const EDEMA_OPTIONS = ["붓기가 없어요", "약간 부었어요", "많이 부었어요"]

export type EdemaLevel = (typeof EDEMA_OPTIONS)[number]

export type ApiEdemaLevel = "NONE" | "SLIGHT" | "SEVERE"

export const EDEMA_LEVEL_TO_LABEL: Record<ApiEdemaLevel, EdemaLevel> = {
  NONE: EDEMA_OPTIONS[0],
  SLIGHT: EDEMA_OPTIONS[1],
  SEVERE: EDEMA_OPTIONS[2],
}

export const LABEL_TO_EDEMA_LEVEL: Record<EdemaLevel, ApiEdemaLevel> = {
  [EDEMA_OPTIONS[0]]: "NONE",
  [EDEMA_OPTIONS[1]]: "SLIGHT",
  [EDEMA_OPTIONS[2]]: "SEVERE",
}
