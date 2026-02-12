import { Text, View, XStack, YStack } from "tamagui"
import { TouchableOpacity } from "react-native"
import { QUICK_ADD_OPTIONS, WATER_COLORS } from "../../data/hydrationConstants"
import { WaterDroplet } from "./WaterDroplet"

interface HydrationTrackerProps {
  intake: number
  dailyGoal: number
  percentage: number
  remaining: number
  isGoalAchieved: boolean
  addWater: (amount: number) => void
}

export function HydrationTracker({
  intake,
  dailyGoal,
  percentage,
  remaining,
  isGoalAchieved,
  addWater,
}: HydrationTrackerProps) {
  return (
    <YStack paddingHorizontal="$3" paddingVertical="$3" gap="$3">
      <Text fontSize="$6" fontWeight="700">
        수분섭취 기록하기
      </Text>

      <XStack
        backgroundColor="$backgroundFocus"
        borderRadius="$6"
        paddingVertical="$4"
        paddingHorizontal="$5"
        alignItems="center"
        gap="$5"
      >
        <WaterDroplet percentage={percentage} />

        <YStack flex={1} gap="$2">
          <XStack alignItems="baseline" gap="$1">
            <Text fontSize={32} fontWeight="700" color="$gray12">
              {intake}
            </Text>
            <Text fontSize="$4" color="$gray10">
              /{dailyGoal}ml
            </Text>
          </XStack>

          <View
            backgroundColor={WATER_COLORS.backgroundLight}
            paddingHorizontal={8}
            paddingVertical={5}
            borderRadius="$4"
            alignSelf="flex-start"
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

          <XStack gap="$2" flexWrap="wrap">
            {QUICK_ADD_OPTIONS.map((amount) => (
              <TouchableOpacity
                key={amount}
                onPress={() => addWater(amount)}
                style={{
                  backgroundColor: WATER_COLORS.backgroundLight,
                  paddingVertical: 5,
                  paddingHorizontal: 6,
                  borderRadius: 8,
                }}
                activeOpacity={0.7}
              >
                <Text
                  color={WATER_COLORS.buttonText}
                  fontWeight="600"
                  fontSize="$2"
                >
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
