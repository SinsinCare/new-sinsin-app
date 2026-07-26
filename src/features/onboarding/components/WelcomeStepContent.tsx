import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, XStack, Text } from "tamagui"
import { tokens } from "@/src/theme/tokens"

interface WelcomeStepContentProps {
  selectedValue: boolean | null
  onSelect: (hasCkd: boolean) => void
}

const OPTIONS = [
  { hasCkd: true, label: "신장 질환자" },
  { hasCkd: false, label: "비환자" },
] as const

export function WelcomeStepContent({
  selectedValue,
  onSelect,
}: WelcomeStepContentProps) {
  const isDark = useAppColorScheme() === "dark"
  const unselectedBg = isDark ? tokens.color.cardBgDark.val : "white"
  const unselectedBorder = isDark
    ? "rgba(100,105,115,0.4)"
    : "rgba(218,223,230,0.6)"
  const selectedBg = isDark ? "#1A3A2E" : "#F0FDF9"
  const unselectedText = isDark ? tokens.color.textDark.val : "#17191C"

  return (
    <XStack gap={12}>
      {OPTIONS.map((option) => {
        const isSelected = selectedValue === option.hasCkd
        return (
          <Pressable
            key={String(option.hasCkd)}
            onPress={() => onSelect(option.hasCkd)}
            style={{ flex: 1 }}
          >
            <YStack
              height={96}
              borderRadius={16}
              borderWidth={1.5}
              borderColor={isSelected ? tokens.color.sub6.val : unselectedBorder}
              backgroundColor={isSelected ? selectedBg : unselectedBg}
              alignItems="center"
              justifyContent="center"
            >
              <Text
                fontSize={17}
                fontWeight={isSelected ? "700" : "500"}
                color={isSelected ? tokens.color.sub8.val : unselectedText}
                letterSpacing={-0.3}
                textAlign="center"
              >
                {option.label}
              </Text>
            </YStack>
          </Pressable>
        )
      })}
    </XStack>
  )
}
