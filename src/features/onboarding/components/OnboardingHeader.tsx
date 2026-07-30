import { Pressable } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { useSurface } from "@/src/hooks/useSurface"
import { TYPE } from "@/src/theme/surface"

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
  const { t } = useTranslation("auth")
  const shouldShowBack = showBack ?? currentStepIndex > 0
  const surface = useSurface()
  const textColor = surface.textStrong
  const textSub = surface.textWeak

  return (
    <XStack height={56} alignItems="center" paddingHorizontal={4}>
      {shouldShowBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={onBack}
          style={{ padding: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </Pressable>
      ) : (
        <YStack width={40} />
      )}
      <YStack flex={1} alignItems="center">
        {title ? (
          <Text
            fontSize={TYPE.cardTitle.fontSize}
            fontWeight="600"
            color={textColor}
            letterSpacing={TYPE.cardTitle.letterSpacing}
          >
            {title}
          </Text>
        ) : null}
      </YStack>
      {showCounter && totalSteps > 0 ? (
        <YStack paddingHorizontal={8} alignItems="flex-end">
          <Text fontSize={TYPE.caption.fontSize} color={textSub}>
            {currentStepIndex + 1}/{totalSteps}
          </Text>
        </YStack>
      ) : (
        <YStack width={40} />
      )}
    </XStack>
  )
}
