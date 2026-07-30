import type { EdemaLevel } from "../types"

export type { EdemaLevel }

export const EDEMA_OPTIONS: EdemaLevel[] = ["NONE", "SLIGHT", "SEVERE"]

/**
 * 서버 값을 화면이 아는 단계로 맞춘다.
 *
 * 예전 클라이언트가 `SOME` 으로 저장한 기록이 아직 남아 있다(서버 통계도
 * `EDEMA_PRESENT` 에서 같은 호환을 한다). 모르는 값을 그대로 번역 키에 넣으면
 * i18next 가 키 문자열을 돌려줘 화면에 `home.edema.level.SOME` 이 그대로 찍힌다 —
 * 실제로 홈 타일에 `home.ede…` 로 잘려 보였다.
 */
export function normalizeEdemaLevel(value: string | null | undefined) {
  if (value === "SOME") return "SLIGHT" as EdemaLevel
  return (EDEMA_OPTIONS as string[]).includes(value ?? "")
    ? (value as EdemaLevel)
    : null
}

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
