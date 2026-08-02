import { Pressable } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"

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
    <XStack
      height={LAYOUT.headerHeight}
      alignItems="center"
      paddingHorizontal={LAYOUT.screenX}
    >
      {shouldShowBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={onBack}
          // 아이콘 상자를 본문과 같은 screenX 에 두고 터치 영역은 44 로 남긴다.
          // LAYOUT.iconButton 머리말 참고 — 예전 값(4 + 8 = 12)은 본문보다 8 왼쪽이었다.
          style={{
            padding: LAYOUT.iconButton.pad,
            marginLeft: -LAYOUT.iconButton.pad,
          }}
        >
          <Ionicons
            name="chevron-back"
            size={LAYOUT.iconButton.size}
            color={textColor}
          />
        </Pressable>
      ) : (
        <YStack width={LAYOUT.iconButton.size} />
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
        <YStack alignItems="flex-end">
          <Text fontSize={TYPE.caption.fontSize} color={textSub}>
            {currentStepIndex + 1}/{totalSteps}
          </Text>
        </YStack>
      ) : (
        <YStack width={LAYOUT.iconButton.size} />
      )}
    </XStack>
  )
}
