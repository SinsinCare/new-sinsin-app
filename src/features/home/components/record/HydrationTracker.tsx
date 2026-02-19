import { Text, XStack, YStack } from "tamagui"
import { TouchableOpacity, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import Svg, { Text as SvgText, Defs, ClipPath, Rect } from "react-native-svg"
import {
  CAP_H,
  FONT_SIZE,
  PCT_X,
  QUICK_ADD_OPTIONS,
  SVG_HEIGHT,
  SVG_WIDTH,
  TEXT_BASELINE,
  WATER_COLORS,
} from "../../data/hydrationConstants"
import { tokens } from "@/src/theme/tokens"

interface HydrationTrackerProps {
  intake: number
  dailyGoal: number
  percentage: number
  remaining: number
  isGoalAchieved: boolean
  addWater: (amount: number) => void
  onReset: () => void
}

export function HydrationTracker({
  intake,
  dailyGoal,
  percentage,
  remaining,
  isGoalAchieved,
  addWater,
  onReset,
}: HydrationTrackerProps) {
  const fillRatio = Math.min(percentage, 100) / 100
  const waterY = TEXT_BASELINE - fillRatio * CAP_H

  return (
    <YStack paddingVertical="$3" gap="$3">
      <XStack justifyContent="space-between">
        <Text fontSize="$6" fontWeight="700">
          수분 섭취 기록
        </Text>

        <TouchableOpacity onPress={onReset} activeOpacity={0.7}>
          <XStack marginTop={6} gap={4}>
            <Text fontSize="$4" fontWeight="500" color="$colorSubtle">
              되돌리기
            </Text>
            <Ionicons
              name="refresh-outline"
              size={14}
              color={tokens.color.grey5.val}
            />
          </XStack>
        </TouchableOpacity>
      </XStack>

      <XStack
        backgroundColor="$cardBackground"
        borderRadius="$6"
        paddingVertical="$4"
        paddingHorizontal="$4"
        alignItems="center"
      >
        {/* Left: intake info */}
        <YStack gap="$2" flex={1}>
          <XStack alignItems="baseline" gap={2}>
            <Text fontSize={32} fontWeight="700">
              {intake}
            </Text>
            <Text fontSize="$4" color="$colorSubtle" fontWeight="600">
              /{dailyGoal}ml
            </Text>
          </XStack>
          <Text fontSize="$3" color="$colorSubtle" fontWeight="600">
            {isGoalAchieved ? "목표 달성!" : `${remaining}ml 남았어요`}
          </Text>
        </YStack>

        {/* Right: droplet icon + water-fill % text */}
        <YStack alignItems="flex-end" gap={2} flexShrink={0} width={SVG_WIDTH}>
          <Ionicons name="water" size={20} color={WATER_COLORS.gradientEnd} />
          <Svg width={SVG_WIDTH} height={SVG_HEIGHT}>
            <Defs>
              <ClipPath id="percentClip">
                {/* number grows leftward from PCT_X */}
                <SvgText
                  x={PCT_X}
                  y={TEXT_BASELINE}
                  fontSize={FONT_SIZE}
                  fontWeight="800"
                  textAnchor="end"
                >
                  {Math.round(percentage)}
                </SvgText>
                {/* "%" fixed at PCT_X */}
                <SvgText
                  x={PCT_X}
                  y={TEXT_BASELINE}
                  fontSize={FONT_SIZE}
                  fontWeight="800"
                  textAnchor="start"
                >
                  %
                </SvgText>
              </ClipPath>
            </Defs>

            {/* Unfilled (gray) layer */}
            <Rect
              x={0}
              y={0}
              width={SVG_WIDTH}
              height={SVG_HEIGHT}
              fill={tokens.color.grey6.val}
              clipPath="url(#percentClip)"
            />

            {/* Water fill (blue) — rises from bottom */}
            <Rect
              x={0}
              y={waterY}
              width={SVG_WIDTH}
              height={SVG_HEIGHT - waterY}
              fill={WATER_COLORS.gradientStart}
              clipPath="url(#percentClip)"
            />
          </Svg>
        </YStack>
      </XStack>

      {/* Quick add + reset buttons */}
      <XStack gap="$3" justifyContent="center" flexWrap="wrap">
        {QUICK_ADD_OPTIONS.map((amount) => (
          <TouchableOpacity
            key={amount}
            onPress={() => addWater(amount)}
            style={styles.chip}
            activeOpacity={0.7}
          >
            <Text fontSize="$4" fontWeight="500" color="$color">
              +{amount >= 1000 ? `${amount / 1000}L` : `${amount}ml`}
            </Text>
          </TouchableOpacity>
        ))}
      </XStack>
    </YStack>
  )
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: tokens.color.pureWhite.val,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
})
