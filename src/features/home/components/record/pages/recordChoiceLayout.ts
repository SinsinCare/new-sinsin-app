import { FORM, S } from "./recordPageSpec"

/** Budget for one unbroken option label, including Hangul glyphs and touch padding. */
export function recordChoiceColumns(
  labels: string[],
  width: number,
  fontScale: number,
  /** 소비처가 원하는 열 수(별점 5개를 한 줄로). 라벨이 안 들어가면 아래 후보로 내려간다. */
  preferred?: number,
): number {
  if (!labels.length) return 1
  const maxEm = Math.max(
    ...labels.map((label) =>
      Array.from(label).reduce(
        (sum, char) =>
          sum +
          (/\s/u.test(char) ? 0.35 : /[\u0000-\u007f]/u.test(char) ? 0.62 : 1),
        0,
      ),
    ),
  )
  const needed = maxEm * FORM.option.fontSize * fontScale + S[2] * 2 + 4
  // Four choices use 4 or 2 columns; a three-plus-one row obscures their equality.
  const base =
    labels.length === 4 ? [4, 2, 1] : [Math.min(labels.length, 3), 2, 1]
  const candidates =
    preferred && preferred > 0
      ? [Math.min(preferred, labels.length), ...base]
      : base
  return (
    candidates.find(
      (columns) => (width - S[2] * (columns - 1)) / columns >= needed,
    ) ?? 1
  )
}
