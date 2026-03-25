import { Pressable } from "react-native"
import { YStack, XStack, Text } from "tamagui"

interface GenderSelectorProps {
  value: "male" | "female" | ""
  onChange: (gender: "male" | "female") => void
}

export function GenderSelector({ value, onChange }: GenderSelectorProps) {
  return (
    <YStack>
      <XStack paddingBottom={10}>
        <Text
          fontSize={13}
          fontWeight="500"
          color="#17191C"
          letterSpacing={-0.3}
          lineHeight={18.2}
        >
          성별
        </Text>
        <Text fontSize={13} fontWeight="500" color="#FF3B30">
          {" "}
          *
        </Text>
      </XStack>
      <XStack gap={8}>
        <Pressable style={{ flex: 1 }} onPress={() => onChange("male")}>
          <YStack
            height={52}
            borderRadius={8}
            borderWidth={1}
            borderColor={value === "male" ? "#44AF94" : "rgba(218,223,230,0.6)"}
            backgroundColor={value === "male" ? "#F0FDF4" : "white"}
            alignItems="center"
            justifyContent="center"
          >
            <Text
              fontSize={16}
              fontWeight={value === "male" ? "600" : "400"}
              color={value === "male" ? "#0D896A" : "#17191C"}
              letterSpacing={-0.3}
            >
              남자
            </Text>
          </YStack>
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => onChange("female")}>
          <YStack
            height={52}
            borderRadius={8}
            borderWidth={1}
            borderColor={
              value === "female" ? "#44AF94" : "rgba(218,223,230,0.6)"
            }
            backgroundColor={value === "female" ? "#F0FDF4" : "white"}
            alignItems="center"
            justifyContent="center"
          >
            <Text
              fontSize={16}
              fontWeight={value === "female" ? "600" : "400"}
              color={value === "female" ? "#0D896A" : "#17191C"}
              letterSpacing={-0.3}
            >
              여자
            </Text>
          </YStack>
        </Pressable>
      </XStack>
    </YStack>
  )
}
