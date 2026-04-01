import { Pressable, useColorScheme } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { Checkbox } from "@/src/shared/components"
import { tokens } from "@/src/theme/tokens"
import type { OnboardingValueOption } from "../types"

interface MultiStepContentProps {
  options: OnboardingValueOption[]
  selectedKeys: string[]
  onToggle: (key: string) => void
}

export function MultiStepContent({
  options,
  selectedKeys,
  onToggle,
}: MultiStepContentProps) {
  const isDark = useColorScheme() === "dark"
  const unselectedBg = isDark ? tokens.color.cardBgDark.val : "white"
  const unselectedBorder = isDark
    ? "rgba(100,105,115,0.4)"
    : "rgba(218,223,230,0.6)"
  const selectedBg = isDark ? "#1A3A2E" : "#F0FDF9"
  const unselectedText = isDark ? tokens.color.textDark.val : "#17191C"

  return (
    <YStack gap={12}>
      {options.map((option, index) => {
        const isSelected = selectedKeys.includes(option.key)
        return (
          <Pressable
            key={`${index}-${option.key}`}
            onPress={() => onToggle(option.key)}
          >
            <XStack
              height={56}
              borderRadius={12}
              borderWidth={1.5}
              borderColor={isSelected ? "#34D399" : unselectedBorder}
              backgroundColor={isSelected ? selectedBg : unselectedBg}
              alignItems="center"
              paddingHorizontal={16}
              gap={12}
            >
              <Checkbox
                checked={isSelected}
                onToggle={() => onToggle(option.key)}
              />
              <Text
                fontSize={16}
                fontWeight={isSelected ? "600" : "400"}
                color={isSelected ? "#0D896A" : unselectedText}
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
