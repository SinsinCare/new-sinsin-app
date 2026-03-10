import { Pressable } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { Ionicons } from "@expo/vector-icons"

interface OnboardingHeaderProps {
  currentStepIndex: number
  totalSteps: number
  onBack: () => void
  onSkip: () => void
  showCounter?: boolean
  showBack?: boolean
}

export function OnboardingHeader({
  currentStepIndex,
  totalSteps,
  onBack,
  onSkip,
  showCounter = true,
  showBack,
}: OnboardingHeaderProps) {
  const shouldShowBack = showBack ?? currentStepIndex > 0

  return (
    <XStack height={56} alignItems="center" paddingHorizontal={4}>
      {shouldShowBack ? (
        <Pressable onPress={onBack} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#17191C" />
        </Pressable>
      ) : (
        <YStack width={40} />
      )}
      <YStack flex={1} alignItems="center">
        {showCounter && (
          <Text fontSize={14} fontWeight="500" color="#787C83">
            {currentStepIndex + 1} / {totalSteps}
          </Text>
        )}
      </YStack>
      <Pressable onPress={onSkip} style={{ padding: 8 }}>
        <Text fontSize={14} color="#787C83">
          건너뛰기
        </Text>
      </Pressable>
    </XStack>
  )
}
