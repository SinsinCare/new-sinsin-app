import { Pressable } from "react-native"
import { V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
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
    <V2HStack
      align="center"
      paddingHorizontal={LAYOUT.screenX}
      style={{ height: LAYOUT.headerHeight }}
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
        <V2VStack style={{ width: LAYOUT.iconButton.size }} />
      )}
      <V2VStack flex={1} align="center">
        {title ? (
          <V2Text
            color={textColor}
            style={{
              fontSize: TYPE.cardTitle.fontSize,
              fontWeight: "600",
              letterSpacing: TYPE.cardTitle.letterSpacing,
            }}
          >
            {title}
          </V2Text>
        ) : null}
      </V2VStack>
      {showCounter && totalSteps > 0 ? (
        <V2VStack align="flex-end">
          <V2Text color={textSub} style={{ fontSize: TYPE.caption.fontSize }}>
            {currentStepIndex + 1}/{totalSteps}
          </V2Text>
        </V2VStack>
      ) : (
        <V2VStack style={{ width: LAYOUT.iconButton.size }} />
      )}
    </V2HStack>
  )
}
