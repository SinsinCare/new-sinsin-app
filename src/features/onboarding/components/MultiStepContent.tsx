import { Pressable } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { Checkbox } from "@/src/shared/components"
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
  return (
    <YStack gap={12}>
      {options.map((option, index) => {
        const isSelected = selectedKeys.includes(option.key)
        return (
          <Pressable key={`${index}-${option.key}`} onPress={() => onToggle(option.key)}>
            <XStack
              height={56}
              borderRadius={12}
              borderWidth={1.5}
              borderColor={isSelected ? "#5464F2" : "rgba(218,223,230,0.6)"}
              backgroundColor={isSelected ? "#F5F6FF" : "white"}
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
                color={isSelected ? "#5464F2" : "#17191C"}
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
