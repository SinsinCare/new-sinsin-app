import { Pressable } from "react-native"
import { YStack, XStack, Text } from "tamagui"
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
              height={56}
              borderRadius={12}
              borderWidth={1.5}
              borderColor={isSelected ? "#34D399" : "rgba(218,223,230,0.6)"}
              backgroundColor={isSelected ? "#F0FDF9" : "white"}
              alignItems="center"
              paddingHorizontal={16}
              gap={12}
            >
              <YStack
                width={22}
                height={22}
                borderRadius={11}
                borderWidth={isSelected ? 6 : 1.5}
                borderColor={isSelected ? "#34D399" : "#C5C8CE"}
                backgroundColor="white"
              />
              <Text
                fontSize={16}
                fontWeight={isSelected ? "600" : "400"}
                color={isSelected ? "#0D896A" : "#17191C"}
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
