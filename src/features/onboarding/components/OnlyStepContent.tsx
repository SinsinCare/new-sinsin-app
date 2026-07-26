import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, XStack, Text } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import type { OnboardingValueOption } from "../types"

interface OnlyStepContentProps {
  options: OnboardingValueOption[]
  selectedKeys: string[]
  onSelect: (key: string) => void
}

export function OnlyStepContent({
  options,
  selectedKeys,
  onSelect,
}: OnlyStepContentProps) {
  const isDark = useAppColorScheme() === "dark"
  const unselectedBg = isDark ? tokens.color.cardBgDark.val : "white"
  const unselectedBorder = isDark
    ? "rgba(100,105,115,0.4)"
    : "rgba(218,223,230,0.6)"
  const selectedBg = isDark ? "#1A3A2E" : "#F0FDF9"
  const unselectedText = isDark ? tokens.color.textDark.val : "#17191C"
  const radioBorder = isDark ? "#6B7280" : "#C5C8CE"
  const radioBg = isDark ? tokens.color.cardBgDark.val : "white"

  return (
    <YStack gap={12}>
      {options.map((option, index) => {
        const isSelected = selectedKeys.includes(option.key)
        return (
          <Pressable
            key={`${index}-${option.key}`}
            onPress={() => onSelect(option.key)}
          >
            <XStack
              minHeight={56}
              paddingVertical={14}
              borderRadius={12}
              borderWidth={1.5}
              borderColor={isSelected ? tokens.color.sub6.val : unselectedBorder}
              backgroundColor={isSelected ? selectedBg : unselectedBg}
              alignItems="center"
              paddingHorizontal={16}
              gap={12}
            >
              <YStack
                width={22}
                height={22}
                borderRadius={11}
                borderWidth={isSelected ? 6 : 1.5}
                borderColor={isSelected ? tokens.color.sub6.val : radioBorder}
                backgroundColor={radioBg}
              />
              <Text
                fontSize={16}
                fontWeight={isSelected ? "600" : "400"}
                color={isSelected ? tokens.color.sub8.val : unselectedText}
                letterSpacing={-0.3}
                flex={1}
              >
                {option.value}
              </Text>
            </XStack>
          </Pressable>
        )
      })}
    </YStack>
  )
}
