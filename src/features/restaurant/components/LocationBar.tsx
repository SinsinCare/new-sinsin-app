import { useColorScheme } from "react-native"
import { XStack, Text } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"
import { useCurrentAddress } from "../hooks/useCurrentAddress"

const COLORS = {
  light: {
    border: "#E7E7EE",
    text: "#2A2A37",
  },
  dark: {
    border: "#313138",
    text: "#E7E7EE",
  },
} as const

export function LocationBar() {
  const isDark = useColorScheme() === "dark"
  const color = isDark ? COLORS.dark : COLORS.light
  const { address, isLoading, error } = useCurrentAddress()

  const displayText = isLoading
    ? "위치 확인 중..."
    : error
      ? "위치를 확인할 수 없습니다"
      : address

  return (
    <XStack
      alignItems="center"
      gap={6}
      paddingHorizontal={16}
      paddingVertical={8}
      borderBottomWidth={2}
      borderBottomColor={color.border}
    >
      <Icon name="location" size={24} color={color.text} />
      <Text
        fontSize={14}
        fontWeight="500"
        fontFamily="$body"
        color={color.text}
      >
        {displayText}
      </Text>
    </XStack>
  )
}
