import { useColorScheme } from "react-native"
import { YStack, Text } from "tamagui"
import { tokens } from "@/src/theme/tokens"

export function ConsultHeader() {
  const isDark = useColorScheme() === "dark"
  const borderColor = isDark ? tokens.color.grey3.val : tokens.color.grey8.val

  return (
    <YStack
      paddingHorizontal="$5"
      paddingBottom="$3"
      style={{ borderBottomWidth: 1, borderBottomColor: borderColor }}
    >
      <Text
        fontFamily="$heading"
        fontSize="$8"
        fontWeight="700"
        color="$color"
        textAlign="center"
      >
        상담
      </Text>
    </YStack>
  )
}
