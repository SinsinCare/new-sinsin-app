/**
 * 다크 베이스맵 위 플로팅 컨트롤의 face + hairline 계약.
 *
 * 라이트 지도에서는 흰 타일과 그림자가 경계를 만들었다. 다크 타일로 전환한 뒤에는
 * 지도 평균 L과 `background.default`가 거의 같아 검색바·칩·FAB가 지도에 묻혔다.
 * 그림자는 어두운 배경에서 경계를 만들 수 없으므로 면을 한 단 올리고 얕은 선을 둔다.
 */
import type { ViewStyle } from "react-native"

export type MapOverlayChromePalette = {
  mode: "light" | "dark"
  background: { default: string; lower: string }
  line: { alternative: string }
}

export function mapOverlayChrome(palette: MapOverlayChromePalette): ViewStyle {
  return {
    backgroundColor:
      palette.mode === "dark"
        ? palette.background.lower
        : palette.background.default,
    borderWidth: 1,
    borderColor: palette.line.alternative,
  }
}

/**
 * 지도 위에 뜨는 컨트롤의 그림자. **의도된 DS 이탈이고, 한 곳에만 둔다.**
 *
 * v2 elevation 은 평면 화면용이다. 지도 타일 위에서는 검색바·칩·pill·FAB가 같은
 * 높이에 떠야 하므로 이 값 하나를 공유한다. face/hairline은 mapOverlayChrome이 맡는다.
 */
export const FLOATING_SHADOW: ViewStyle = {
  shadowColor: "rgb(0, 27, 55)",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.14,
  shadowRadius: 8,
  elevation: 4,
}
