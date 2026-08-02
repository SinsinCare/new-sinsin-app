/**
 * 지도 위에 뜨는 컨트롤의 그림자. **의도된 DS 이탈이고, 한 곳에만 둔다.**
 *
 * ## 왜 새로 만들었나
 *
 * v2 elevation 은 두 단계뿐이고(`shadowRadius` 1 과 3) 문서가 "시스템은 거의 평면이다,
 * 모달의 깊이는 그림자가 아니라 `background.dim` 이 만든다" 고 못박고 있다. 그 전제는
 * **배경이 흰 면**일 때 성립한다. 지도 타일 위에서는 성립하지 않는다 — 흰 검색바를
 * 그림자 없이 얹으면 흰 건물 폴리곤과 경계가 사라져 컨트롤이 지도의 일부처럼 보인다.
 *
 * 그래서 `elevation[2]` 보다 부드럽고 넓은 값을 하나 정의했다. 값을 여러 파일에 복사하지
 * 않는 이유: 검색바·칩·pill·FAB 가 같은 평면에 떠 있어야 하고, 그림자가 조금씩 다르면
 * 각자 다른 높이에 뜬 것처럼 보인다.
 *
 * 지도 밖(일반 화면)에서는 쓰지 말 것. 그쪽은 DS 규칙대로 평면이 맞다.
 */

import type { ViewStyle } from "react-native"

export const FLOATING_SHADOW: ViewStyle = {
  shadowColor: "rgb(0, 27, 55)",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.14,
  shadowRadius: 8,
  // 안드로이드는 shadow* 를 무시하고 elevation 만 본다.
  elevation: 4,
}
