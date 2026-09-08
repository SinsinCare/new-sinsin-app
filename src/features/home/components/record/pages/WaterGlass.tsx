import { useEffect, useId } from "react"
import { StyleSheet } from "react-native"
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg"
import { recordInk } from "./recordInk"
import { RECORD_TIMING } from "./recordMotion"

const AnimatedRect = Animated.createAnimatedComponent(Rect)
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse)

/** A rounded rim, a liquid surface and reflected edges give the supplied cup its depth. */
export function WaterGlass({
  size,
  percent,
  amount,
  hasLimit,
  ink,
  textColor,
  showLabels = true,
}: {
  size: number
  percent: number
  amount: string
  hasLimit: boolean
  ink: ReturnType<typeof recordInk>
  textColor: string
  showLabels?: boolean
}) {
  const id = useId().replace(/:/gu, "")
  const level = useSharedValue(0)
  const ratio = hasLimit ? Math.min(1, Math.max(0, percent / 100)) : 0
  useEffect(() => {
    level.value = withTiming(ratio, { ...RECORD_TIMING, duration: 650 })
  }, [level, ratio])
  const liquidProps = useAnimatedProps(() => ({
    y: 288 - 220 * level.value,
    height: 238 * level.value,
  }))
  const surfaceProps = useAnimatedProps(() => ({
    cy: 288 - 220 * level.value,
    rx: 77 + 18 * level.value,
    opacity: Math.min(1, level.value * 30),
  }))
  const body =
    "M72 68 C72 44 262 44 262 68 L244 269 Q244 288 167 288 Q90 288 90 269 Z"
  const labels = (color: string, secondaryColor = color) => (
    <>
      <SvgText
        x="167"
        y="199"
        textAnchor="middle"
        fontFamily="Pretendard-Bold"
        fontWeight="700"
        fontSize="30"
        fill={color}
      >
        {hasLimit ? `${percent}%` : amount}
      </SvgText>
      <SvgText
        x="167"
        y="223"
        textAnchor="middle"
        fontFamily="Pretendard-Medium"
        fontWeight="500"
        fontSize="15"
        fill={secondaryColor}
      >
        {hasLimit ? `${amount} mL` : "mL"}
      </SvgText>
    </>
  )
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 335 335"
      style={StyleSheet.absoluteFill}
      accessible={false}
    >
      <Defs>
        <ClipPath id={`${id}-cup`}>
          <Path d={body} />
        </ClipPath>
        <ClipPath id={`${id}-level`}>
          <AnimatedRect x="60" width="215" animatedProps={liquidProps} />
        </ClipPath>
        <LinearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={ink.waterGlass} />
          <Stop offset="1" stopColor={ink.waterGlass} stopOpacity="0.65" />
        </LinearGradient>
        <LinearGradient id={`${id}-water`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={ink.waterFill} />
          <Stop offset="0.6" stopColor={ink.waterFill} />
          <Stop offset="1" stopColor={ink.waterFillDeep} />
        </LinearGradient>
      </Defs>
      <Ellipse
        cx="167"
        cy="288"
        rx="73"
        ry="10"
        fill={ink.waterFill}
        opacity="0.07"
      />
      <Path d={body} fill={`url(#${id}-glass)`} />
      <G clipPath={`url(#${id}-cup)`}>
        <AnimatedRect
          x="60"
          width="215"
          animatedProps={liquidProps}
          fill={`url(#${id}-water)`}
        />
        <AnimatedEllipse
          cx="167"
          ry="12"
          animatedProps={surfaceProps}
          fill={ink.waterSurface}
        />
        {showLabels && labels(textColor)}
        <G clipPath={`url(#${id}-level)`}>
          {showLabels && labels(ink.waterValue, ink.waterValueMuted)}
        </G>
      </G>
      <Path
        d={body}
        fill="none"
        stroke={ink.waterGlassEdge}
        strokeWidth="2.5"
      />
      <Path
        d="M82 90 L96 252"
        fill="none"
        stroke={ink.waterGlassEdge}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.65"
      />
      <Ellipse
        cx="167"
        cy="68"
        rx="95"
        ry="16"
        fill="none"
        stroke={ink.waterGlassEdge}
        strokeWidth="1.5"
      />
    </Svg>
  )
}
