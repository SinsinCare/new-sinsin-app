import { useSurface } from "@/src/hooks/useSurface"

/** Small report annotations carry evidence, so use the readable body tier.
 * Hierarchy comes from size/weight rather than low-contrast assistive labels. */
export function useReportSurface() {
  const surface = useSurface()
  return {
    ...surface,
    textMuted: surface.text,
    textWeak: surface.text,
    hairline: surface.border,
  }
}
