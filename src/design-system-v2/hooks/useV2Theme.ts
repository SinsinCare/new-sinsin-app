// Design System v2 — 현재 컬러스킴에 맞춘 테마 훅
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { resolveTheme, type V2Theme } from "../theme"

/**
 * 앱의 현재 모드에 맞는 v2 시맨틱 색상을 반환.
 *
 * **OS 의 `useColorScheme` 을 직접 보지 않는다.** 앱에는 설정의 테마 토글
 * (`themeStore`: system / light / dark)이 있고, 레거시 계보는 `useAppColorScheme` 으로
 * 그걸 본다. 여기서 OS 만 보면 **사용자가 앱 안에서 다크로 고정했을 때
 * 식당 탭(v2 55개 파일)만 라이트로 남는다** — 탭마다 모드가 갈리는 결함이었다.
 * 두 계보가 같은 한 곳(`useAppColorScheme`)을 보게 두는 것이 이 훅의 계약이다.
 *
 * @example
 * const { colors } = useV2Theme()
 * <View style={{ backgroundColor: colors.background.default }} />
 */
export function useV2Theme(): V2Theme {
  return resolveTheme(useAppColorScheme())
}
