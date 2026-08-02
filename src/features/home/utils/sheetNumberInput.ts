/**
 * 기록 시트의 숫자 직접 입력 로직.
 *
 * 화면이 아니라 여기 있는 이유: "타이핑 중"과 "확정"은 규칙이 다른데, 이걸 컴포넌트
 * 안에 두면 두 규칙이 섞여서 **글자를 지울 수 없는 입력창**이 만들어진다. 흔한 실패가
 * `onChangeText` 에서 곧바로 숫자로 파싱해 clamp 하는 것이다 — 그러면 "7" 을 지우려는
 * 순간 빈 문자열이 min 으로 되살아나고, 소수점을 찍는 "72." 도 중간 상태로 존재할 수
 * 없어서 72.5 를 칠 방법이 사라진다.
 *
 * 그래서 두 단계로 나눈다.
 *  1. `sanitizeSheetNumberText` — 타이핑 중. 모양만 본다. 빈 문자열과 "72." 를 **허용**한다.
 *  2. `commitSheetNumber` — 확정(포커스 아웃·완료·저장). 그때 처음으로 숫자가 된다.
 */

export interface SheetNumberSpec {
  /** 확정 시 이 아래로는 올리고, 위로는 내린다. */
  min: number
  max: number
  /** 소수 자릿수. 0 이면 소수점 자체를 입력할 수 없다. */
  decimals: number
}

/**
 * 타이핑 중 허용할 문자만 남긴다.
 *
 * - 숫자가 아닌 문자는 버린다(키패드로도 붙여넣기는 들어온다).
 * - 소수점은 `decimals > 0` 일 때 **하나만** 남긴다.
 * - 소수부는 `decimals` 자리에서 자른다. 확정할 때 반올림해서 값이 갑자기 바뀌는 것보다,
 *   애초에 칠 수 없게 막는 편이 예측 가능하다.
 * - 정수부는 `max` 의 자릿수까지만. 4자리 제한을 컴포넌트마다 매직넘버로 두지 않는다.
 *
 * 빈 문자열과 "72." 를 그대로 돌려주는 것이 이 함수의 핵심이다. 둘 다 정상적인 중간 상태다.
 */
export function sanitizeSheetNumberText(
  text: string,
  spec: SheetNumberSpec,
): string {
  const allowDot = spec.decimals > 0
  let seenDot = false
  let out = ""

  for (const char of text) {
    if (char >= "0" && char <= "9") {
      out += char
      continue
    }
    // 로케일에 따라 쉼표가 소수점으로 올 수 있다(iOS decimal-pad).
    if ((char === "." || char === ",") && allowDot && !seenDot) {
      seenDot = true
      out += "."
    }
  }

  const [whole = "", fraction] = out.split(".")
  const maxWholeDigits = Math.trunc(Math.abs(spec.max)).toString().length
  const clippedWhole = whole.slice(0, maxWholeDigits)

  if (fraction === undefined) return clippedWhole
  return `${clippedWhole}.${fraction.slice(0, spec.decimals)}`
}

/**
 * 확정. 값이 없으면 `null` 이다 — **0 이 아니다.**
 * "지웠다"와 "0을 입력했다"는 다른 뜻이고, 기록에서는 특히 다르다.
 *
 * 범위를 벗어난 값은 자른다(거부하지 않는다). 시트의 CTA 라벨과 큰 숫자가 확정된 값을
 * 즉시 보여 주므로, 잘린 사실이 화면에 그대로 드러난다. 반대로 거부하면 사용자가 친 값이
 * 조용히 사라진다.
 */
export function commitSheetNumber(
  text: string,
  spec: SheetNumberSpec,
): number | null {
  const trimmed = text.trim()
  if (trimmed === "" || trimmed === ".") return null

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return null

  const clamped = Math.min(spec.max, Math.max(spec.min, parsed))
  return roundTo(clamped, spec.decimals)
}

/** 확정된 값을 다시 입력창에 넣을 때의 표기. 자릿수를 규격에 맞춘다. */
export function formatSheetNumber(
  value: number,
  spec: SheetNumberSpec,
): string {
  return roundTo(value, spec.decimals).toFixed(spec.decimals)
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
