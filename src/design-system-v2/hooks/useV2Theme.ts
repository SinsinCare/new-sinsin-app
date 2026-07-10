// Design System v2 — 현재 컬러스킴에 맞춘 테마 훅
import { useColorScheme } from "react-native"
import { resolveTheme, type V2Theme } from "../theme"

/**
 * OS 다크모드에 따라 v2 시맨틱 색상을 반환.
 * @example
 * const { colors } = useV2Theme()
 * <View style={{ backgroundColor: colors.background.default }} />
 */
export function useV2Theme(): V2Theme {
  const scheme = useColorScheme()
  return resolveTheme(scheme === "dark" ? "dark" : "light")
}
