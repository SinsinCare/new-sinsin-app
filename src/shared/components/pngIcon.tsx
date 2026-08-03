/**
 * PNG 자산을 SVG 아이콘 자리(`<Icon width height />`)에 끼우는 래퍼.
 *
 * 카테고리 아이콘이 SVG(평면)에서 디자인 전달 PNG(입체)로 넘어가는 과도기 —
 * 호출부들은 전부 `ComponentType<{width,height,opacity}>` 계약만 쓰므로, 자산 형식이
 * 바뀌어도 호출부는 한 줄(import)만 바뀐다. 색 틴트는 지원하지 않는다(입체
 * 래스터는 칠할 수 없다) — 틴트가 필요한 자리에는 애초에 이 래퍼를 쓰지 말 것.
 *
 * **자산 규칙: 여기 물리는 PNG 는 투명 여백을 잘라내(=콘텐츠가 캔버스를 꽉 채우게)
 * 커밋한다.** SVG 형제들의 viewBox 가 아트를 꽉 감싸는 것과 같은 관행이다. 전달
 * 원본의 투명 여백을 그대로 두면 같은 상자에서 SVG 형제보다 25~50% 작게 그려진다 —
 * 레시피/식당 카테고리의 한·중·일 3종이 실제로 그렇게 작아 보였다(2026-08-03).
 * 아이콘별 광학 보정(어떤 것만 살짝 키우기)은 투명 픽셀에 숨기지 말고 호출부
 * 코드에 명시할 것.
 *
 * `assetFile` 을 정적으로 붙이는 이유: jest 의 회귀망
 * (`tests/recipeCategoryArtIcons.test.ts`)이 "키에 **맞는** 자산이 붙었는가"와
 * "그 파일이 저장소에 실제로 있는가"를 검사한다. SVG 는 트랜스포머가 파일명을
 * 돌려줘 공짜였지만, PNG 는 번들러가 숫자 id 로 바꿔 이름이 사라진다 — 그래서
 * 이름을 컴포넌트에 새겨 같은 검사를 유지한다.
 */

import type { ComponentType } from "react"
import { Image } from "expo-image"

export interface PngIconProps {
  width?: number | string
  height?: number | string
  /** 식당 지도 칩이 비활성 카테고리를 이걸로 눌러 그린다. SvgProps 폭(NumberProp)에 맞춘다. */
  opacity?: number | string
}

export type PngIconComponent = ComponentType<PngIconProps> & {
  /** `assets/images/` 아래의 실제 파일명. 회귀 테스트가 읽는다. */
  readonly assetFile: string
}

export function pngIcon(source: number, assetFile: string): PngIconComponent {
  function PngIcon({ width, height, opacity }: PngIconProps) {
    // 한 변만 받으면 그 값을 정사각 상자로 삼는다. SVG 는 빠진 변을 파일의 고유
    // 치수로 채우지만 래스터 호출부의 의도는 "이만한 자리"다 — 정사각 상자에
    // contain 으로 앉히면 납작한 그림(초밥)은 자연히 낮게, 둥근 그림은 꽉 차게
    // 그려져 SVG 형제와 광학 크기가 맞는다.
    const boxWidth = Number(width ?? height ?? 24)
    const boxHeight = Number(height ?? width ?? 24)
    return (
      <Image
        source={source}
        style={{
          width: boxWidth,
          height: boxHeight,
          ...(opacity === undefined ? null : { opacity: Number(opacity) }),
        }}
        contentFit="contain"
      />
    )
  }
  return Object.assign(PngIcon, { assetFile })
}
