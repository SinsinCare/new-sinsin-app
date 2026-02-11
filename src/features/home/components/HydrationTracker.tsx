import React from "react"
import { Text, View, XStack, YStack } from "tamagui"
import { TouchableOpacity } from "react-native"
import Svg, {
  Defs,
  ClipPath,
  Path,
  Rect,
  LinearGradient,
  Stop,
  G,
  Text as SvgText,
} from "react-native-svg"
import { useHydration } from "../hooks/useHydration"
import { QUICK_ADD_OPTIONS } from "../data/hydrationConstants"
import { getWaterLevel } from "../utils/getWaterLevel"

export default function HydrationTracker() {
  const { intake, dailyGoal, percentage, remaining, isGoalAchieved, addWater } =
    useHydration()

  const waterLevel = getWaterLevel(percentage)

  return (
    <YStack paddingHorizontal="$3" paddingVertical="$3" gap="$3">
      <Text fontSize="$6" fontWeight="700">
        수분섭취 기록하기
      </Text>

      <XStack
        backgroundColor="#F3F3F3"
        borderRadius="$6"
        paddingVertical="$4"
        paddingHorizontal="$5"
        alignItems="center"
        gap="$5"
      >
        {/* 물방울 시각화 */}
        <Svg width={90} height={95} viewBox="30 15 140 170">
          <Defs>
            <ClipPath id="dropletClip">
              <Path d="M100,20 C100,20 40,80 40,120 C40,153.137 66.863,180 100,180 C133.137,180 160,153.137 160,120 C160,80 100,20 100,20 Z" />
            </ClipPath>
            <LinearGradient
              id="waterGradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <Stop offset="0%" stopColor="#93c5fd" />
              <Stop offset="100%" stopColor="#3b82f6" />
            </LinearGradient>
          </Defs>

          <Path
            d="M100,20 C100,20 40,80 40,120 C40,153.137 66.863,180 100,180 C133.137,180 160,153.137 160,120 C160,80 100,20 100,20 Z"
            fill="#e0f2fe"
            stroke="#cbd5e1"
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

        <YStack flex={1} gap="$2">
          {/* 섭취량 */}
          <XStack alignItems="baseline" gap="$1">
            <Text fontSize={32} fontWeight="700" color="$gray12">
              {intake}
            </Text>
            <Text fontSize="$4" color="$gray10">
              /{dailyGoal}ml
            </Text>
          </XStack>

          {/* 남은 양 / 달성 메시지 */}
          <View
            style={{
              backgroundColor: "#e0f2fe",
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: 8,
              alignSelf: "flex-start",
            }}
          >
            {!isGoalAchieved ? (
              <Text fontSize="$3" fontWeight="600">
                {remaining}ml 남았어요
              </Text>
            ) : (
              <Text fontSize="$3" fontWeight="700">
                목표 달성!
              </Text>
            )}
          </View>

          {/* 추가 버튼 */}
          <XStack gap="$2" flexWrap="wrap">
            {QUICK_ADD_OPTIONS.map((amount) => (
              <TouchableOpacity
                key={amount}
                onPress={() => addWater(amount)}
                style={{
                  backgroundColor: "#e0f2fe",
                  paddingVertical: 5,
                  paddingHorizontal: 6,
                  borderRadius: 8,
                }}
                activeOpacity={0.7}
              >
                <Text color="$blue11" fontWeight="600" fontSize="$2">
                  +{amount >= 1000 ? `${amount / 1000}L` : `${amount}ml`}
                </Text>
              </TouchableOpacity>
            ))}
          </XStack>
        </YStack>
      </XStack>
    </YStack>
  )
}
