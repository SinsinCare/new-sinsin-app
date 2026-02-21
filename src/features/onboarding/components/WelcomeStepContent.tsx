import { Pressable } from "react-native"
import { YStack, XStack, Text } from "tamagui"

interface WelcomeStepContentProps {
  selectedValue: boolean | null
  onSelect: (hasCkd: boolean) => void
}

const OPTIONS = [
  { hasCkd: true, label: "네, 진단을 받았어요" },
  { hasCkd: false, label: "아니오, 예방 목적이에요" },
] as const

export function WelcomeStepContent({
  selectedValue,
  onSelect,
}: WelcomeStepContentProps) {
  return (
    <YStack gap={12}>
      {OPTIONS.map((option) => {
        const isSelected = selectedValue === option.hasCkd
        return (
          <Pressable
            key={String(option.hasCkd)}
            onPress={() => onSelect(option.hasCkd)}
          >
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
              <YStack
                width={22}
                height={22}
                borderRadius={11}
                borderWidth={isSelected ? 6 : 1.5}
                borderColor={isSelected ? "#5464F2" : "#C5C8CE"}
                backgroundColor="white"
              />
              <Text
                fontSize={16}
                fontWeight={isSelected ? "600" : "400"}
                color={isSelected ? "#5464F2" : "#17191C"}
                letterSpacing={-0.3}
                flex={1}
              >
                {option.label}
              </Text>
            </XStack>
          </Pressable>
        )
      })}
    </YStack>
  )
}
