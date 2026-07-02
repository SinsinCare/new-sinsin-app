import { Text, XStack, YStack } from "tamagui"
import { Pressable, StyleSheet } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Ionicons } from "@expo/vector-icons"
import { Icon } from "@/src/shared/components/Icon"
import {
  QUICK_ADD_LABELS,
  QUICK_ADD_OPTIONS,
} from "../../data/hydrationConstants"
import { tokens } from "@/src/theme/tokens"

interface HydrationTrackerProps {
  intake: number
  addWater: (amount: number) => void
  onReset: () => void
}

export function HydrationTracker({
  intake,
  addWater,
  onReset,
}: HydrationTrackerProps) {
  const isDarkMode = useAppColorScheme() === "dark"

  const chipBg = isDarkMode
    ? tokens.color.cardBgDark.val
    : tokens.color.pureWhite.val

  return (
    <YStack paddingVertical="$3" gap="$3">
      <XStack justifyContent="space-between" alignItems="center">
        <Text
          fontSize={20}
          fontWeight="600"
          color={isDarkMode ? "$textDark" : "$black"}
        >
          수분 섭취 기록
        </Text>
        <Pressable
          onPress={onReset}
          hitSlop={8}
          style={({ pressed }) => ({
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <XStack gap={2} alignItems="center">
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
              ml
            </Text>
          </XStack>
          <Text fontSize={13} color="$colorSubtle" fontWeight="500">
            오늘 마신 물
          </Text>
        </YStack>

        <XStack
          alignItems="center"
          justifyContent="center"
          width={52}
          height={52}
          borderRadius={26}
          backgroundColor={
            isDarkMode
              ? tokens.color.waterPercentBgDark.val
              : tokens.color.waterPercentBg.val
          }
          flexShrink={0}
        >
          <Icon
            name="water-drop"
            size={28}
            color={tokens.color.waterFillBottom.val}
          />
        </XStack>
      </XStack>

      <XStack gap={5} flexWrap="wrap">
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
            <Text fontSize={15} color={isDarkMode ? "$textDarkSub" : "$color"}>
              +
              {QUICK_ADD_LABELS[amount] ??
                (amount >= 1000 ? `${amount / 1000}L` : `${amount}ml`)}
            </Text>
          </Pressable>
        ))}
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
