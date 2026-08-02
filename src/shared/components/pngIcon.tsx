/**
 * PNG 자산을 SVG 아이콘 자리(`<Icon width height />`)에 끼우는 래퍼.
 *
 * 카테고리 아이콘이 SVG(평면)에서 디자인 전달 PNG(입체)로 넘어가는 과도기 —
 * 호출부들은 전부 `ComponentType<{width,height,opacity}>` 계약만 쓰므로, 자산 형식이
 * 바뀌어도 호출부는 한 줄(import)만 바뀐다. 색 틴트는 지원하지 않는다(입체
 * 래스터는 칠할 수 없다) — 틴트가 필요한 자리에는 애초에 이 래퍼를 쓰지 말 것.
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
  function PngIcon({ width = 24, height = 24, opacity }: PngIconProps) {
    return (
      <Image
        source={source}
        style={{
          width: Number(width),
          height: Number(height),
          ...(opacity === undefined ? null : { opacity: Number(opacity) }),
        }}
        contentFit="contain"
      />
    )
  }
  return Object.assign(PngIcon, { assetFile })
}
