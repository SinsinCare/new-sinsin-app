export type V2ToastVariant = "success" | "caution" | "error" | "default"

export type ToastBorderPalette = {
  lineAlternative: string
  success: string
  caution: string
  error: string
}

/** `#RRGGBB`/`#RRGGBBAA`에 새 알파를 안전하게 붙인다. */
function withAlpha(color: string, alpha: string): string {
  if (/^#[0-9a-f]{8}$/iu.test(color)) return `${color.slice(0, 7)}${alpha}`
  if (/^#[0-9a-f]{6}$/iu.test(color)) return `${color}${alpha}`
  // 토큰이 hex가 아닌 플랫폼 색으로 바뀌면 깨진 문자열을 만들지 않고 원값을 쓴다.
  return color
}

export type ToastFacePalette = {
  /** 라이트 화면 위에서 쓰는 고정 잉크. */
  lightInk: string
  /** 다크 화면의 body/default 면. 토스트도 이 값과 정확히 같게 한다. */
  darkBody: string
}

/**
 * 토스트 면.
 *
 * 라이트에서는 어두운 필이 흰 화면 위에 떠야 한다. 다크에서는 고정 잉크(#2a2a37)를
 * 쓰면 주변 #1f1f21과 OKLCH chroma가 달라 남보라 카드 하나만 튄다. 다크는 body와
 * **같은 색**을 쓰고, 경계는 얕은 보더가 담당한다.
 */
export function toastBackgroundColor(
  mode: "light" | "dark",
  palette: ToastFacePalette,
): string {
  return mode === "dark" ? palette.darkBody : withAlpha(palette.lightInk, "f5")
}

/**
 * 토스트의 얕은 의미 보더.
 *
 * 면 전체를 의미색으로 칠하면 짧은 통보가 경고 배너처럼 무거워진다. 1px 보더만
 * 성공/주의/오류를 구분하고, 기본 통보는 탭바와 같은 `line.alternative`로 외곽만
 * 드러낸다. 의미색도 같은 알파 `38`(약 22%)을 써 **탭바 보더와 같은 존재감**이다.
 * 아이콘보다 훨씬 낮아 의미를 보조할 뿐 위계를 뺏지 않는다.
 */
export function toastBorderColor(
  variant: V2ToastVariant,
  palette: ToastBorderPalette,
): string {
  if (variant === "success") return withAlpha(palette.success, "38")
  if (variant === "caution") return withAlpha(palette.caution, "38")
  if (variant === "error") return withAlpha(palette.error, "38")
  return palette.lineAlternative
}
