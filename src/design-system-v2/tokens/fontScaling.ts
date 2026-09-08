/** Bounds affect accessibility enlargement only; the normal design sizes never change. */
export const FONT_SCALE = {
  caption: 1.6,
  body: 1.5,
  title: 1.35,
  display: 1.25,
  control: 1.3,
  input: 1.3,
} as const
export function textScaleLimit(fontSize?: number): number | undefined {
  if (fontSize == null || !Number.isFinite(fontSize)) return undefined
  if (fontSize >= 26) return FONT_SCALE.display
  if (fontSize >= 20) return FONT_SCALE.title
  if (fontSize <= 13) return FONT_SCALE.caption
  return FONT_SCALE.body
}
export function effectiveTextScale(systemScale: number, limit: number) {
  return Math.min(Math.max(1, systemScale), limit)
}
