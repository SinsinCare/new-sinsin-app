import { Text, XStack, YStack } from "tamagui"
import { TouchableOpacity, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Icon } from "@/src/shared/components/Icon"
import Svg, {
  Text as SvgText,
  Defs,
  ClipPath,
  Rect,
  LinearGradient,
  Stop,
} from "react-native-svg"
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
        <Text fontSize={20} fontWeight="600">
          수분 섭취 기록
        </Text>
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

        {/* Right: water-fill % text + droplet icon (same row) */}
        <XStack alignItems="center" paddingBottom={5} flexShrink={0} gap={1}>
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
              <LinearGradient
                id="waterGradient"
                x1="0"
                y1="0"
                x2="0"
                y2={SVG_HEIGHT}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0" stopColor={WATER_COLORS.gradientTop} />
                <Stop offset="1" stopColor={WATER_COLORS.gradientBottom} />
              </LinearGradient>
            </Defs>

            {/* Unfilled (bg) layer */}
            <Rect
              x={0}
              y={0}
              width={SVG_WIDTH}
              height={SVG_HEIGHT}
              fill={WATER_COLORS.percentBg}
              clipPath="url(#percentClip)"
            />

            {/* Water fill — rises from bottom */}
            <Rect
              x={0}
              y={waterY}
              width={SVG_WIDTH}
              height={SVG_HEIGHT - waterY}
              fill="url(#waterGradient)"
              clipPath="url(#percentClip)"
            />
          </Svg>
          <Icon name="water-drop" size={18} style={{ marginBottom: 18 }} />
        </XStack>
      </XStack>

      <XStack
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
      >
        {/* Quick add + reset buttons */}
        <XStack gap={5}>
          {QUICK_ADD_OPTIONS.map((amount) => (
            <TouchableOpacity
              key={amount}
              onPress={() => addWater(amount)}
              style={styles.chip}
              activeOpacity={0.7}
            >
              <Text fontSize={15} color="$color">
                +{amount >= 1000 ? `${amount / 1000}L` : `${amount}ml`}
              </Text>
            </TouchableOpacity>
          ))}
        </XStack>
        <TouchableOpacity onPress={onReset} activeOpacity={0.7}>
          <XStack gap={2}>
            <Text fontSize={14} fontWeight="500" color="$colorSubtle">
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
    </YStack>
  )
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: tokens.color.pureWhite.val,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
})
