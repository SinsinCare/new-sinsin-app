import { Text, XStack, YStack } from "tamagui"
import { Animated, Pressable, StyleSheet, useColorScheme } from "react-native"
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
import { useEffect, useRef, useState } from "react"

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
  const isDarkMode = useColorScheme() === "dark"

  const fillAnim = useRef(new Animated.Value(0)).current
  const [animWaterY, setAnimWaterY] = useState(TEXT_BASELINE)
  const [displayPct, setDisplayPct] = useState(0)

  useEffect(() => {
    const id = fillAnim.addListener(({ value }) => {
      setAnimWaterY(TEXT_BASELINE - value * CAP_H)
      setDisplayPct(Math.round(value * 100))
    })
    return () => fillAnim.removeListener(id)
  }, [fillAnim])

  useEffect(() => {
    const target = Math.min(percentage, 100) / 100
    Animated.spring(fillAnim, {
      toValue: target,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start()
  }, [percentage, fillAnim])
  const chipBg = isDarkMode
    ? tokens.color.cardBgDark.val
    : tokens.color.pureWhite.val

  return (
    <YStack paddingVertical="$3" gap="$3">
      <XStack justifyContent="space-between">
        <Text
          fontSize={20}
          fontWeight="600"
          color={isDarkMode ? "$textDark" : "$black"}
        >
          수분 섭취 기록
        </Text>
      </XStack>

      <XStack
        backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
        borderRadius="$6"
        paddingVertical="$4"
        paddingHorizontal="$4"
        alignItems="center"
      >
        {/* Left: intake info */}
        <YStack gap="$2" flex={1}>
          <XStack alignItems="baseline" gap={2}>
            <Text
              fontSize={32}
              fontWeight="600"
              color={isDarkMode ? "$textDark" : "$black"}
            >
              {intake}
            </Text>
            <Text fontSize="$4" color="$colorSubtle" fontWeight="500">
              /{dailyGoal}ml
            </Text>
          </XStack>
          <Text fontSize={13} color="$colorSubtle" fontWeight="500">
            {isGoalAchieved ? "목표 달성!" : `${remaining}ml 남았어요`}
          </Text>
        </YStack>

        {/* Right: water-fill % text + droplet icon (same row) */}
        <XStack alignItems="center" paddingBottom={5} flexShrink={0} gap={1}>
          <Svg width={SVG_WIDTH} height={SVG_HEIGHT}>
            <Defs>
              <ClipPath id="waterClip">
                <Rect
                  x={0}
                  y={animWaterY}
                  width={SVG_WIDTH}
                  height={SVG_HEIGHT - animWaterY}
                />
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

            {/* 배경 텍스트 (미채움 색) */}
            <SvgText
              x={PCT_X}
              y={TEXT_BASELINE}
              fontSize={FONT_SIZE}
              fontWeight="800"
              textAnchor="end"
              fill={WATER_COLORS.percentBg}
            >
              {displayPct}
            </SvgText>
            <SvgText
              x={PCT_X}
              y={TEXT_BASELINE}
              fontSize={FONT_SIZE}
              fontWeight="800"
              textAnchor="start"
              fill={WATER_COLORS.percentBg}
            >
              %
            </SvgText>

            {/* 물 채운 텍스트 (그라디언트), 아래쪽 직사각형 영역만 보임 */}
            <SvgText
              x={PCT_X}
              y={TEXT_BASELINE}
              fontSize={FONT_SIZE}
              fontWeight="800"
              textAnchor="end"
              fill="url(#waterGradient)"
              clipPath="url(#waterClip)"
            >
              {displayPct}
            </SvgText>
            <SvgText
              x={PCT_X}
              y={TEXT_BASELINE}
              fontSize={FONT_SIZE}
              fontWeight="800"
              textAnchor="start"
              fill="url(#waterGradient)"
              clipPath="url(#waterClip)"
            >
              %
            </SvgText>
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
            <Pressable
              key={amount}
              onPress={() => addWater(amount)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: chipBg,
                  transform: [{ scale: pressed ? 0.93 : 1 }],
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                fontSize={15}
                color={isDarkMode ? "$textDarkSub" : "$color"}
              >
                +{amount >= 1000 ? `${amount / 1000}L` : `${amount}ml`}
              </Text>
            </Pressable>
          ))}
        </XStack>
        <Pressable
          onPress={onReset}
          style={({ pressed }) => ({
            opacity: pressed ? 0.5 : 1,
          })}
        >
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
        </Pressable>
      </XStack>
    </YStack>
  )
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
})
