import { View } from "react-native"
import Svg, { Circle } from "react-native-svg"
import { Text, YStack } from "tamagui"
import { tokens } from "@/src/theme/tokens"

interface ScoreGaugeProps {
  score: number
  size?: number
  strokeWidth?: number
}

function getScoreColor(score: number): string {
  if (score >= 70) return tokens.color.sub7.val
  if (score >= 50) return tokens.color.primary6.val
  return tokens.color.primary8.val
}

export function ScoreGauge({
  score,
  size = 80,
  strokeWidth = 6,
}: ScoreGaugeProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const color = getScoreColor(score)

  return (
    <YStack
      alignItems="center"
      justifyContent="center"
      width={size}
      height={size}
    >
      <View style={{ position: "absolute" }}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={"#e5e7eb"}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress arc */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={"#4db6ac"}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${progress} ${circumference - progress}`}
            strokeDashoffset={circumference * 0.25}
            strokeLinecap="round"
          />
        </Svg>
      </View>
      <Text fontSize="$7" fontWeight="700" color="$color">
        {score}
      </Text>
    </YStack>
  )
}
