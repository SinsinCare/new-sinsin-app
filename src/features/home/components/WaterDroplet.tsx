import Svg, {
  Defs,
  ClipPath,
  Path,
  Rect,
  LinearGradient,
  Stop,
  G,
} from "react-native-svg"
import { WATER_COLORS } from "../data/hydrationConstants"
import { getWaterLevel } from "../utils/getWaterLevel"

const DROPLET_PATH =
  "M100,20 C100,20 40,80 40,120 C40,153.137 66.863,180 100,180 C133.137,180 160,153.137 160,120 C160,80 100,20 100,20 Z"

interface WaterDropletProps {
  percentage: number
}

export function WaterDroplet({ percentage }: WaterDropletProps) {
  const waterLevel = getWaterLevel(percentage)

  return (
    <Svg width={90} height={95} viewBox="30 15 140 170">
      <Defs>
        <ClipPath id="dropletClip">
          <Path d={DROPLET_PATH} />
        </ClipPath>
        <LinearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={WATER_COLORS.gradientStart} />
          <Stop offset="100%" stopColor={WATER_COLORS.gradientEnd} />
        </LinearGradient>
      </Defs>

      <Path
        d={DROPLET_PATH}
        fill={WATER_COLORS.dropletFill}
        stroke={WATER_COLORS.stroke}
        strokeWidth={3}
      />

      <G clipPath="url(#dropletClip)">
        <Rect
          x="0"
          y={waterLevel}
          width="200"
          height="200"
          fill="url(#waterGradient)"
        />
      </G>
    </Svg>
  )
}
