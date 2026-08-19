/**
 * 이 앱이 실제로 쓰는 lucide 아이콘 3종의 로컬 사본.
 *
 * ■ 왜 사본인가
 *
 *   `@tamagui/lucide-icons` 는 배럴(index.native.js)만 노출하고 package.json exports 가
 *   서브패스를 막아 딥 임포트가 불가능합니다. 아이콘 3개를 쓰자고 배럴을 import 하면
 *   아이콘 1,761개 모듈 · 4.4MB 가 통째로 번들에 들어갑니다(번들 실측치).
 *
 * ■ `themed()` 도 걷어냈다 (2026-08-19)
 *
 *   원래 `@tamagui/helpers-icon` 의 `themed()` 로 감싸 `color="$danger"` 같은
 *   **토큰 문자열**을 받을 수 있었다. tamagui 를 걷어내면서 그 해석기가 사라지므로
 *   이제 **concrete 색만** 받는다 — 호출부가 `useV2Theme()` 에서 꺼내 넘기면 된다.
 *   실측: 이 아이콘들의 호출부는 모두 이미 concrete 색을 넘기고 있었다.
 *
 *   geometry 는 lucide 원본 그대로다.
 */
import { memo, type ReactNode } from "react"
import { Svg, Circle, Line, Path, Polyline } from "react-native-svg"

export interface LucideIconProps {
  /** 선 색. 토큰 문자열이 아니라 실제 색 값이어야 한다. */
  color?: string
  size?: number
}

function makeIcon(displayName: string, draw: (color: string) => ReactNode) {
  const Icon = memo(function Icon({
    color = "black",
    size = 24,
  }: LucideIconProps) {
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {draw(color)}
      </Svg>
    )
  })
  Icon.displayName = displayName
  return Icon
}

export const AlertCircle = makeIcon("AlertCircle", (color) => (
  <>
    <Circle cx="12" cy="12" r="10" stroke={color} />
    <Line x1="12" x2="12" y1="8" y2="12" stroke={color} />
    <Line x1="12" x2="12.01" y1="16" y2="16" stroke={color} />
  </>
))

export const AlertTriangle = makeIcon("AlertTriangle", (color) => (
  <>
    <Path
      d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
      stroke={color}
    />
    <Path d="M12 9v4" stroke={color} />
    <Path d="M12 17h.01" stroke={color} />
  </>
))

export const Download = makeIcon("Download", (color) => (
  <>
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={color} />
    <Polyline points="7 10 12 15 17 10" stroke={color} />
    <Line x1="12" x2="12" y1="15" y2="3" stroke={color} />
  </>
))
