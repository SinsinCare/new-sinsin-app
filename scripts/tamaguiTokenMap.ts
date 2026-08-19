/**
 * tamagui `$토큰` → 실제 숫자 매핑표.
 *
 * ## 왜 이 파일이 필요한가
 *
 * tamagui 를 걷어내는 동안 `gap="$3"` 같은 값을 사람이 눈으로 옮기면 **거의 확실히
 * 틀린다.** 같은 `$4` 가 prop 에 따라 **네 가지 다른 값**이기 때문이다:
 *
 * ```
 *   gap/padding/margin  →  space   $4 = 16
 *   width/height        →  size    $4 = 32
 *   fontSize            →  font    $4 = 14
 *   borderRadius        →  radius  $4 = 8
 * ```
 *
 * 잘못 옮겨도 **타입도 린트도 테스트도 통과한다.** 화면을 열어 보기 전에는 모르고,
 * 열어 봐도 8px 과 16px 은 눈으로 잘 구분되지 않는다. 그래서 표를 코드로 두고
 * 그 정확성을 테스트로 잠근다(`tests/tamaguiTokenMap.test.ts`).
 *
 * ## 정본
 *
 * `src/theme/tokens.ts` 의 `createTokens({ space, size, radius })` 와
 * `src/theme/fonts.ts` 의 `createFont({ size, lineHeight })`. **저 두 파일이 정본이고
 * 이 표는 사본이다** — 테스트가 둘을 대조해 어긋나면 실패한다.
 *
 * ## 쓰는 법
 *
 * 이행 스크립트(`scripts/codemod-tamagui-layout.ts`)가 이 표를 참조한다. 손으로 옮길
 * 때도 여기 값을 보고 옮긴다 — 기억에 의존하지 않는다.
 */

/** `gap` `padding*` `margin*` 계열. */
export const SPACE: Record<string, number> = {
  "0": 0,
  "1": 4,
  "1.5": 6,
  "2": 8,
  "2.5": 10,
  "3": 12,
  "3.5": 14,
  "4": 16,
  "4.5": 18,
  "5": 20,
  "6": 24,
  "7": 28,
  "8": 32,
  "9": 36,
  "10": 40,
  true: 16,
  "-1": -4,
  "-2": -8,
  "-3": -12,
  "-4": -16,
}

/** `width` `height` `minWidth` 등 치수 계열. */
export const SIZE: Record<string, number> = {
  "0": 0,
  "1": 8,
  "2": 16,
  "3": 24,
  "4": 32,
  "5": 40,
  "6": 48,
  "7": 56,
  "8": 64,
  "9": 72,
  "10": 80,
  "11": 96,
  "12": 120,
  true: 44,
}

/** `borderRadius` 계열. `$12` 는 pill(999) 이다. */
export const RADIUS: Record<string, number> = {
  "0": 0,
  "1": 2,
  "2": 4,
  "3": 6,
  "4": 8,
  "5": 10,
  "6": 12,
  "7": 14,
  "8": 16,
  "9": 20,
  "10": 24,
  "12": 999,
  true: 16,
}

/** `fontSize`. */
export const FONT_SIZE: Record<string, number> = {
  "1": 10,
  "2": 11,
  "3": 12,
  "4": 14,
  "5": 16,
  "6": 18,
  "7": 20,
  "8": 22,
  "9": 26,
  "10": 28,
  true: 14,
}

/** `lineHeight`. */
export const LINE_HEIGHT: Record<string, number> = {
  "1": 16,
  "2": 18,
  "3": 22,
  "4": 24,
  "5": 26,
  "6": 30,
  "7": 32,
  "8": 34,
  "9": 36,
  "10": 40,
  true: 24,
}

/**
 * prop 이름 → 어떤 스케일을 쓰는가.
 *
 * **이 표가 이 파일의 핵심이다.** `$4` 하나를 옮기려면 먼저 "이 prop 이 어느
 * 스케일인가" 를 알아야 하고, 그 답이 여기 있다.
 */
export function scaleFor(
  prop: string,
): "space" | "size" | "radius" | "font" | "lineHeight" | null {
  if (/^(gap|columnGap|rowGap)$/.test(prop)) return "space"
  if (/^(padding|margin)/.test(prop)) return "space"
  if (/^(top|bottom|left|right)$/.test(prop)) return "space"
  if (/^(width|height|minWidth|minHeight|maxWidth|maxHeight|size)$/.test(prop))
    return "size"
  if (/^border.*Radius$|^borderRadius$/.test(prop)) return "radius"
  if (prop === "fontSize") return "font"
  if (prop === "lineHeight") return "lineHeight"
  return null
}

const TABLES = {
  space: SPACE,
  size: SIZE,
  radius: RADIUS,
  font: FONT_SIZE,
  lineHeight: LINE_HEIGHT,
} as const

/**
 * `resolveToken("gap", "$3")` → `12`.
 *
 * 모르는 조합이면 **`null` 을 돌려준다** — 추측해서 숫자를 만들어 내지 않는다.
 * 이행 스크립트는 null 을 만나면 그 파일을 건너뛰고 사람에게 넘긴다.
 */
export function resolveToken(prop: string, value: string): number | null {
  if (!value.startsWith("$")) return null
  const key = value.slice(1)
  const scale = scaleFor(prop)
  if (!scale) return null
  const table = TABLES[scale]
  return key in table ? table[key] : null
}
