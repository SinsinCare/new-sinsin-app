export type GlucoseTiming = "FASTING" | "BEFORE_MEAL" | "AFTER_MEAL"

export const GLUCOSE_TIMING_OPTIONS: GlucoseTiming[] = [
  "FASTING",
  "BEFORE_MEAL",
  "AFTER_MEAL",
]

/**
 * 어느 끼니의 식전/식후인가. `""` 는 **끼니와 무관하거나(공복) 모른다**는 뜻이다 —
 * 이 축이 생기기 전에 저장된 기록과 구버전 앱이 보낸 기록이 그 값을 갖는다.
 *
 * 종이 혈당 일지가 원래 이 격자다(세로 아침/점심/저녁 · 가로 식전/식후). 서버 유니크도
 * 마이그레이션 081 부터 같은 모양이라, 여기서 고른 끼니가 실제로 한 칸으로 저장된다.
 * 그 전에는 하루 3칸이 상한이라 저녁 식후가 아침 식후를 조용히 덮었다.
 */
export type GlucoseSlot = "BREAKFAST" | "LUNCH" | "DINNER" | ""

/** 하루의 시간 순서. 칩 순서이자 추이선의 x축 순서다. */
export const GLUCOSE_SLOT_OPTIONS: Exclude<GlucoseSlot, "">[] = [
  "BREAKFAST",
  "LUNCH",
  "DINNER",
]

export type GlucoseElapsed = "30M" | "1H" | "2H"

export const GLUCOSE_ELAPSED_OPTIONS: GlucoseElapsed[] = ["30M", "1H", "2H"]
