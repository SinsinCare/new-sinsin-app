import type { EdemaLevel } from "../types"

export type { EdemaLevel }

export const EDEMA_OPTIONS: EdemaLevel[] = ["NONE", "SLIGHT", "SEVERE"]

export const EDEMA_BUTTON_LABEL: Record<EdemaLevel, string> = {
  NONE: "붓기\n없어요",
  SLIGHT: "약간\n부었어요",
  SEVERE: "많이\n부었어요",
}

export const EDEMA_DISPLAY_LABEL: Record<EdemaLevel, string> = {
  NONE: "붓기 없어요",
  SLIGHT: "약간 부었어요",
  SEVERE: "많이 부었어요",
}
