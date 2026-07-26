/**
 * 이 앱이 실제로 쓰는 lucide 아이콘 3종의 로컬 사본.
 *
 * `@tamagui/lucide-icons` 는 배럴(index.native.js)만 노출하고 package.json exports 가
 * 서브패스를 막아 딥 임포트가 불가능합니다. 아이콘 3개를 쓰자고 배럴을 import 하면
 * 아이콘 1,761개 모듈 · 4.4MB 가 통째로 번들에 들어갑니다(번들 실측치).
 *
 * geometry 는 lucide 원본 그대로이고 `themed()` 로 감싸는 것도 동일하므로
 * `color="$danger"` 같은 tamagui 토큰 해석도 그대로 동작합니다.
 */
import { memo, type ReactNode } from "react"
import { Svg, Circle, Line, Path, Polyline } from "react-native-svg"
import { themed } from "@tamagui/helpers-icon"
import type { IconProps } from "@tamagui/helpers-icon"

/**
 * themed() 는 tamagui 토큰을 해석한 뒤 concrete 값으로 내부 컴포넌트를 호출하지만,
 * 타입상으로는 여전히 토큰 유니온이라 react-native-svg 의 prop 타입과 맞지 않습니다.
 * 해석 이후 값만 다루는 지점이라 여기서 좁혀 씁니다.
 */
function makeIcon(displayName: string, draw: (color: string) => ReactNode) {
  const Inner = memo(function Inner(props: IconProps) {
    const color = (props.color as string | undefined) ?? "black"
    const size = (props.size as number | undefined) ?? 24
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
  Inner.displayName = displayName
  return themed(Inner)
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
