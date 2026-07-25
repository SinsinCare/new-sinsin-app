import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, XStack, Text } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { tokens } from "@/src/theme/tokens"

interface OnboardingHeaderProps {
  currentStepIndex: number
  totalSteps: number
  onBack: () => void
  title?: string
  showCounter?: boolean
  showBack?: boolean
}

export function OnboardingHeader({
  currentStepIndex,
  totalSteps,
  onBack,
  title,
  showCounter = true,
  showBack,
}: OnboardingHeaderProps) {
  const shouldShowBack = showBack ?? currentStepIndex > 0
  const isDark = useAppColorScheme() === "dark"
  const textColor = isDark ? tokens.color.textDark.val : "#17191C"
  const textSub = isDark ? tokens.color.textDarkSub.val : "#787C83"

  return (
    <XStack height={56} alignItems="center" paddingHorizontal={4}>
      {shouldShowBack ? (
        <Pressable onPress={onBack} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </Pressable>
      ) : (
        <YStack width={40} />
      )}
      <YStack flex={1} alignItems="center">
        {title ? (
          <Text
            fontSize={16}
            fontWeight="600"
            color={textColor}
            letterSpacing={-0.3}
          >
            {title}
          </Text>
        ) : null}
      </YStack>
      {showCounter && totalSteps > 0 ? (
        <YStack paddingHorizontal={8} alignItems="flex-end">
          <Text fontSize={13} color={textSub}>
            {currentStepIndex + 1}/{totalSteps}
          </Text>
        </YStack>
      ) : (
        <YStack width={40} />
      )}
    </XStack>
  )
}
