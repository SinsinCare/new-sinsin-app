import { Pressable } from "react-native"
import { YStack, XStack, Text } from "tamagui"

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
              borderColor={isSelected ? "#34D399" : "rgba(218,223,230,0.6)"}
              backgroundColor={isSelected ? "#F0FDF9" : "white"}
              alignItems="center"
              justifyContent="center"
            >
              <Text
                fontSize={17}
                fontWeight={isSelected ? "700" : "500"}
                color={isSelected ? "#0D896A" : "#17191C"}
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
