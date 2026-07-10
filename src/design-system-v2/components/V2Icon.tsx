// Design System v2 — Icon
// 앱 아이콘(22종)을 이름으로 골라 색상 토큰으로 칠해 쓰는 컴포넌트.
// SVG는 배경 제거 + currentColor 정규화됨(icons/svg). react-native-svg-transformer로 컴포넌트화.

import type { SvgProps } from "react-native-svg"
import { iconRegistry, type V2IconName } from "../icons/registry"
import { iconSize, type IconSize } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"

// V2IconName은 icons 배럴에서 공개(중복 export 방지 위해 여기선 재-export하지 않음).

export type V2IconProps = Omit<SvgProps, "width" | "height" | "color"> & {
  name: V2IconName
  /** iconSize 토큰(xs·sm·md·lg·xl·2xl) 또는 px 숫자. 기본 md(24) */
  size?: IconSize | number
  /** 아이콘 색. 기본 label.normal(테마 텍스트색). 컨텍스트 색을 넘겨 재사용. */
  color?: string
}

export function V2Icon({ name, size = "md", color, ...rest }: V2IconProps) {
  const { colors } = useV2Theme()
  const Svg = iconRegistry[name]
  const px = typeof size === "number" ? size : iconSize[size]
  return (
    <Svg
      width={px}
      height={px}
      color={color ?? colors.label.normal}
      {...rest}
    />
  )
}
