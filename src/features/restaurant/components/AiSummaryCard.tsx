import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, XStack, Text } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"

const COLORS = {
  light: {
    border: "#F1A89B",
    label: "#EE6145",
    body: "#8E8E93",
    bg: "transparent",
  },
  dark: {
    border: "#E77661",
    label: "#E78D7C",
    body: "#8E8E93",
    bg: "transparent",
  },
} as const

export function AiSummaryCard() {
  const isDark = useAppColorScheme() === "dark"
  const palette = isDark ? COLORS.dark : COLORS.light

  return (
    <YStack
      marginHorizontal={16}
      padding={16}
      borderRadius={12}
      borderWidth={1}
      borderColor={palette.border}
      backgroundColor={palette.bg}
      gap={8}
    >
      <XStack alignItems="center" gap={6}>
        <Icon name="sparkle" size={16} color={palette.label} />
        <Text
          fontSize={14}
          fontWeight="600"
          fontFamily="$body"
          color={palette.label}
        >
          AI 요약
        </Text>
      </XStack>
      <Text fontSize={14} fontFamily="$body" color={palette.body}>
        무슨 내용이 들어갈지 모름
      </Text>
    </YStack>
  )
}
