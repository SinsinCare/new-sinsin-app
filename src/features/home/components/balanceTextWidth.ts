/**
 * 여러 줄 문장의 **줄 폭을 고르게** 만드는 계산.
 *
 * iOS 에는 안드로이드의 `textBreakStrategy="balanced"` 가 없다. 그래서 두세 줄짜리 팁이
 * "첫 줄은 꽉 차고 마지막 줄엔 '계산돼요.' 하나" 처럼 끊긴다 — 읽는 사람에게는
 * 엉뚱한 데서 줄이 바뀐 것으로 보인다(2026-09-02 피드백). 글꼴이 실제로 그린 줄 폭을
 * `onTextLayout` 으로 받아, 같은 줄 수 안에서 각 줄이 비슷한 길이가 되는 폭을 되돌려 준다.
 *
 * 규칙:
 * - 한 줄이면 손대지 않는다(null).
 * - 목표 폭 = 전체 글 폭 / 줄 수 + 여유(`slack`). 여유가 없으면 단어 하나가 넘쳐
 *   줄이 하나 늘어난다.
 * - 목표 폭이 지금 폭보다 좁을 때만 되돌린다. 넓혀서 얻을 것은 없다.
 * - 좁힌 뒤 줄 수가 **늘었으면** 실패다(`shouldRevert`) — 되돌려서 원래 배치를 쓴다.
 *   긴 단어 하나가 목표 폭보다 넓을 때 이런 일이 난다.
 */
export interface MeasuredLine {
  readonly width: number
}

export const BALANCE_SLACK_PT = 8

export function balancedTextWidth(
  lines: readonly MeasuredLine[],
  availableWidth: number,
  slack: number = BALANCE_SLACK_PT,
): number | null {
  if (lines.length < 2 || !(availableWidth > 0)) return null
  const total = lines.reduce((sum, line) => sum + line.width, 0)
  const target = Math.ceil(total / lines.length) + slack
  return target < availableWidth ? target : null
}

/** 폭을 좁힌 뒤의 줄 수가 원래보다 많으면 균형이 아니라 넘침이다. */
export function shouldRevert(
  originalLineCount: number,
  balancedLineCount: number,
): boolean {
  return balancedLineCount > originalLineCount
}

/** `\n` 으로 나뉜 문단. 빈 문단은 버린다 — 문단마다 따로 균형을 맞추기 위해 쓴다. */
export function splitParagraphs(text: string): string[] {
  return text
    .split("\n")
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
}
