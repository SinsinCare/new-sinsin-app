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
