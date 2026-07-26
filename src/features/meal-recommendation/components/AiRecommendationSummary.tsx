import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { XStack, Text } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { tokens } from "@/src/theme/tokens"

interface AiRecommendationSummaryProps {
  summary: string
}

export function AiRecommendationSummary({
  summary,
}: AiRecommendationSummaryProps) {
  const colorScheme = useAppColorScheme()
  const isDark = colorScheme === "dark"

  const bgColor = isDark ? "rgba(238,97,69,0.08)" : "rgba(238,97,69,0.06)"
  const textColor = isDark
    ? tokens.color.textDark.val
    : tokens.color.textLight.val

  return (
    <XStack
      backgroundColor={bgColor}
      borderRadius={12}
      padding={12}
      gap={8}
      alignItems="flex-start"
      borderWidth={1}
      borderColor={
        isDark ? "rgba(238,97,69,0.15)" : "rgba(238,97,69,0.12)"
      }
    >
      <Ionicons
        name="sparkles"
        size={16}
        color={tokens.color.primaryAccent.val}
        style={{ marginTop: 1 }}
      />
      <Text
        flex={1}
        fontSize={13}
        fontFamily="$body"
        lineHeight={20}
        color={textColor}
      >
        {summary}
      </Text>
    </XStack>
  )
}
