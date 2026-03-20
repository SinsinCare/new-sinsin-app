import { Pressable } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { Ionicons } from "@expo/vector-icons"

interface OnboardingHeaderProps {
  currentStepIndex: number
  totalSteps: number
  onBack: () => void
  onSkip: () => void
  title?: string
  showCounter?: boolean
  showBack?: boolean
}

export function OnboardingHeader({
  currentStepIndex,
  totalSteps,
  onBack,
  onSkip,
  title,
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
        {title ? (
          <Text
            fontSize={16}
            fontWeight="600"
            color="#17191C"
            letterSpacing={-0.3}
          >
            {title}
          </Text>
        ) : null}
      </YStack>
      {showCounter && totalSteps > 0 ? (
        <YStack paddingHorizontal={8} alignItems="flex-end">
          <Text fontSize={13} color="#787C83">
            {currentStepIndex + 1}/{totalSteps}
          </Text>
        </YStack>
      ) : (
        <Pressable onPress={onSkip} style={{ padding: 8 }}>
          <Text fontSize={14} color="#787C83">
            건너뛰기
          </Text>
        </Pressable>
      )}
    </XStack>
  )
}
