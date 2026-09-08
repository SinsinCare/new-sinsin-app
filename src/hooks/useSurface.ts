import { useMemo } from "react"
import { useAppColorScheme } from "./useAppColorScheme"
import {
  getSurfacePalette,
  surfaceBodyText,
  type SurfacePalette,
} from "@/src/theme/surface"

/**
 * 화면 표면 팔레트. 규칙은 theme/surface.ts 주석 참고.
 * 가입·온보딩·홈이 같은 훅을 쓴다.
 */
export function useSurface(): SurfacePalette & {
  isDark: boolean
  textOnSurface: string
} {
  const isDark = useAppColorScheme() === "dark"
  return useMemo(() => {
    const palette = getSurfacePalette(isDark)
    return {
      ...palette,
      isDark,
      textOnSurface: surfaceBodyText({ ...palette, isDark }),
    }
  }, [isDark])
}
