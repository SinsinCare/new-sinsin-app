import { Pressable, useColorScheme } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { tokens } from "@/src/theme/tokens"

interface GenderSelectorProps {
  value: "male" | "female" | ""
  onChange: (gender: "male" | "female") => void
}

export function GenderSelector({ value, onChange }: GenderSelectorProps) {
  const isDark = useColorScheme() === "dark"
  const labelColor = isDark ? tokens.color.textDark.val : "#17191C"
  const unselectedBg = isDark ? "#2A2A32" : "white"
  const unselectedText = isDark ? tokens.color.textDark.val : "#17191C"
  const unselectedBorder = isDark ? "#3A3A42" : "rgba(218,223,230,0.6)"
  const selectedBg = isDark ? "#0D896A20" : "#F0FDF4"

  return (
    <YStack>
      <XStack paddingBottom={10}>
        <Text
          fontSize={13}
          fontWeight="500"
          color={labelColor}
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
            borderColor={value === "male" ? "#44AF94" : unselectedBorder}
            backgroundColor={value === "male" ? selectedBg : unselectedBg}
            alignItems="center"
            justifyContent="center"
          >
            <Text
              fontSize={16}
              fontWeight={value === "male" ? "600" : "400"}
              color={value === "male" ? "#0D896A" : unselectedText}
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
            borderColor={value === "female" ? "#44AF94" : unselectedBorder}
            backgroundColor={value === "female" ? selectedBg : unselectedBg}
            alignItems="center"
            justifyContent="center"
          >
            <Text
              fontSize={16}
              fontWeight={value === "female" ? "600" : "400"}
              color={value === "female" ? "#0D896A" : unselectedText}
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
