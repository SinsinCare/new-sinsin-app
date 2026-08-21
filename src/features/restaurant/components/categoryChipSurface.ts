/**
 * 카테고리 칩의 **해석된 표면** — (선택 여부 × 컬러모드)를 최종 값으로 푼다.
 *
 * ## 왜 컴포넌트에서 빼냈나
 *
 * 이 저장소의 jest 는 `testEnvironment: "node"` 라 컴포넌트를 렌더하지 않는다. 그래서
 * 칩의 선택 표시를 지키던 검사가 전부 "소스에 그 문자열이 **있는가**" 였고, 그 스타일이
 * **캐스케이드에서 이기는가**는 아무도 안 봤다 — 2026-08-21 지적: 선택 표시(브랜드
 * 테두리 + 틴트 면)를 통째로 지워도 다섯 개 가드가 전부 초록이었다.
 *
 * 색·굵기·그림자를 순수 함수로 내리면 그 구멍이 닫힌다. 테스트가 `railChipSurface()` 를
 * **호출해서 값을 비교**할 수 있고, `active` 분기를 지우는 변이는 값이 같아지는 순간
 * 빨개진다. 치수(높이·간격)는 여전히 StyleSheet 에 남지만, 그쪽은 적용 블록을 잘라
 * 파싱해서 본다(`restaurantCategoryChip.test.ts`).
 *
 * ## 라이트 — 시안 그대로
 *
 * 선택 = 브랜드 테두리(`#FE7139`) + 옅은 브랜드 틴트 면(`#FFF8F6`). 틴트는 새로 고른
 * hex 가 아니라 `primary.primaryWeak`(`#fff4f099`)를 칩 자신의 면에 얹은 계산값이다.
 * 토큰을 **그대로** 깔면 안 되는 이유는 알파(0x99)다 — 흰 시트 위(목록)에서는 우연히
 * 시안값이 나오지만 지도 위에서는 뒤의 타일이 40% 비쳐 칩이 반투명해진다.
 *
 * ## 다크 — 틴트를 깔지 않는다 (2026-08-21)
 *
 * 시안은 라이트 한 벌뿐이다(`Light.svg`). 다크는 우리 파생이고, 종전 파생이 틀렸다.
 *
 *   `semanticDark.primary.primaryWeak` 는 **`#282828`** 이다. 브랜드 틴트가 아니라
 *   불투명한 진회색이고, 토큰 파일에 `TODO(design)` 로 "Figma 가 다크를 안 나눠서 값을
 *   지어내지 않고 옛 값을 둔다" 고 적혀 있는 **미정 값**이다. 그걸 칩 면에 얹으면
 *   `over()` 가 알파 없는 값을 그대로 통과시켜 선택 칩 면이 `#313135` → `#282828` 로
 *   **내려간다**. `mapOverlayChrome` 이 세운 "다크 타일 위에서 컨트롤 면을 한 단 올린다"
 *   를 이 칩 하나만 역행하고, 선택한 칩이 안 고른 칩보다 어두워진다.
 *
 * 그래서 다크에서는 면을 chrome 그대로 두고 선택을 **브랜드 테두리에만** 싣는다.
 * `#FE7139` 대 `#313135` 는 대비 4.7:1 이라 1pt 선으로도 충분히 읽히고, 굵기 이중화도
 * 그대로 남는다. 면이 안 바뀌므로 다크에서 선택 신호는 "테두리 + 굵기" 둘이 된다.
 *
 * 버린 대안 둘:
 *
 *   - `primary.primary` 에 알파를 붙여 틴트를 만든다 → **색을 새로 고르는 것**이다.
 *     `blend.ts` 머리말이 금지한다("색을 만들어 내는 게 아니라 정본 두 값이 겹쳤을 때의
 *     결과를 계산할 뿐이다").
 *   - `accentForeground.orangeWeak`(`#ff920033`)를 쓴다 → 그 램프의 주황은 브랜드
 *     `#FE7139` 가 아니라 `#FF9200`(lightOrange)이다. 같은 칩에 서로 다른 주황 두 개가
 *     생기고, `accentForeground` 는 이름 그대로 **글자색** 램프지 컨트롤 면이 아니다.
 *
 * 다크의 `primaryWeak` 가 Figma 에서 확정되는 날 이 분기를 지우면 된다. 그때는 위
 * 대비 단언이 그대로 새 값을 검증한다.
 */
import type { TextStyle, ViewStyle } from "react-native"

import { over } from "@/src/design-system-v2/tokens/blend"
import { typography } from "@/src/design-system-v2/tokens/typography"

import { FLOATING_SHADOW, mapOverlayChrome } from "./mapFloating"

/** `useV2Theme().colors` 중 이 칩이 실제로 읽는 부분만. */
export type RailChipPalette = {
  primary: { primary: string; primaryWeak: string }
  label: { normal: string }
  background: { default: string; lower: string }
  line: { alternative: string }
}

export interface RailChipSurface {
  /** 칩 면. 라이트 선택만 틴트가 얹힌다. */
  backgroundColor: string
  /** 선택이면 브랜드, 아니면 공용 hairline. */
  borderColor: string
  /**
   * **두 상태가 같아야 한다.** Yoga 는 border 를 padding 처럼 상자에 더하므로
   * 1→1.5pt 는 칩 폭을 흔들고, 고를 때마다 뒤 칩들이 밀린다.
   */
  borderWidth: number
  /**
   * 지도 타일과 칩을 가르는 것은 선이 아니라 **이 그림자**다 — 시안의 지도 화면에서
   * 미선택 칩은 hairline 없이 그림자만으로 배경과 갈라진다. 장식이 아니라 경계 그 자체라
   * 두 상태 모두가 갖는다.
   */
  shadow: ViewStyle
  /** 라벨 잉크. 두 상태가 같다(시안에서 선택·미선택 글리프가 픽셀 단위로 동일). */
  color: string
  /**
   * 라벨 텍스트 스타일. 굵기는 **face 로만** 말한다(`fontWeight` 를 주면 OS 기본 서체로
   * 그려진다 — `typography.ts` 머리말). 색맹 이중화이고 시안에는 없지만 일부러 남긴다.
   */
  typography: TextStyle
}

export function railChipSurface({
  active,
  mode,
  colors,
}: {
  active: boolean
  mode: "light" | "dark"
  colors: RailChipPalette
}): RailChipSurface {
  const chrome = mapOverlayChrome({ mode, ...colors })
  /* `mapOverlayChrome` 은 언제나 팔레트의 hex 와 1 을 넣는다(그 파일 본문). ViewStyle 의
     `ColorValue | undefined` 를 여기서 한 번만 좁힌다 — `over()` 는 문자열만 받는다. */
  const face = chrome.backgroundColor as string
  const hairline = chrome.borderColor as string
  const width = chrome.borderWidth as number

  // 머리말 §다크 — 다크는 틴트를 깔지 않는다(깔면 면이 내려간다).
  const selectedFace =
    mode === "dark" ? face : over(colors.primary.primaryWeak, face)

  return {
    backgroundColor: active ? selectedFace : face,
    borderColor: active ? colors.primary.primary : hairline,
    borderWidth: width,
    shadow: FLOATING_SHADOW,
    color: colors.label.normal,
    typography: active ? typography.label.xSmall : typography.label.xSmallWeak,
  }
}
