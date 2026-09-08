import { primitives } from "@/src/design-system-v2/tokens/colors"
import { surfaceBodyText } from "@/src/theme/surface"

/**
 * 물잔 삽화의 전용 팔레트. 중성 바탕에 옅은 블루만 두고, 중요한 동작의 주황색과
 * 경쟁하지 않게 한다. 물 위 숫자는 어두운 회색으로 읽힌다. 다크에서는 명암을 뒤집는다.
 * 본문·버튼의 회색은 기존 디자인 토큰을 쓰고, 물의 색만 삽화 전용으로 둔다.
 */
export interface RecordInkSet {
  readonly errorText: string
  readonly waterCard: string
  readonly waterGlass: string
  readonly waterGlassEdge: string
  readonly waterFill: string
  readonly waterFillDeep: string
  readonly waterSurface: string
  readonly waterFab: string
  readonly waterFabGlyph: string
  readonly waterValue: string
  readonly waterValueMuted: string
  readonly brandSoft: string
}

export const RECORD_INK: { light: RecordInkSet; dark: RecordInkSet } = {
  light: {
    errorText: primitives.red[700],
    waterCard: primitives.grayscale[100],
    waterGlass: primitives.common[0],
    waterGlassEdge: primitives.grayscale[300],
    waterFill: "#B6D5F5",
    waterFillDeep: "#A7C9EE",
    waterSurface: "#D9E8FA",
    waterFab: primitives.common[0],
    waterFabGlyph: primitives.grayscale[700],
    waterValue: primitives.grayscale[800],
    waterValueMuted: primitives.grayscale[800],
    // 혈압 선택 칩은 기존 팔레트를 유지한다. 시간 표기에는 쓰지 않는다.
    brandSoft: "#FFF4F0",
  },
  dark: {
    errorText: primitives.red[300],
    waterCard: "#24282E",
    waterGlass: "#303740",
    waterGlassEdge: "rgba(224,232,242,0.22)",
    waterFill: "#344C66",
    waterFillDeep: "#2B4058",
    waterSurface: "#496582",
    waterFab: primitives.grayscale[200],
    waterFabGlyph: primitives.grayscale[800],
    waterValue: primitives.grayscale[100],
    waterValueMuted: primitives.grayscale[200],
    brandSoft: "rgba(254,113,57,0.18)",
  },
}

export function recordInk(isDark: boolean): RecordInkSet {
  return isDark ? RECORD_INK.dark : RECORD_INK.light
}

/** Small labels need additional contrast on raised dark input/summary surfaces. */
export function recordFieldLabel(surface: {
  isDark: boolean
  text: string
}): string {
  return surfaceBodyText(surface)
}
