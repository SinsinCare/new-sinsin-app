/**
 * SVG 아이콘 래퍼. assets/icons/ 의 SVG는 stroke/fill에 "currentColor"를
 * 사용해야 color prop으로 런타임 색상 변경이 가능합니다.
 */
import { SvgProps } from "react-native-svg"
import ChevronRight from "@/assets/icons/chevron-right.svg"

const icons = {
  "chevron-right": ChevronRight,
} as const

export type IconName = keyof typeof icons

interface IconProps extends Omit<SvgProps, "width" | "height"> {
  name: IconName
  size?: number
  color?: string
}

export function Icon({
  name,
  size = 24,
  color = "#A5A5AF",
  ...props
}: IconProps) {
  const SvgComponent = icons[name]
  return <SvgComponent width={size} height={size} color={color} {...props} />
}
