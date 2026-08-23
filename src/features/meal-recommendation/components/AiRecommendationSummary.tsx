import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { V2HStack, V2Icon, V2Text } from "@/src/design-system-v2"
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
    <V2HStack
      padding={12}
      gap={8}
      align="flex-start"
      style={{
        backgroundColor: bgColor,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isDark ? "rgba(238,97,69,0.15)" : "rgba(238,97,69,0.12)",
      }}
    >
      <V2Icon name="sparkle" size={16} style={{ marginTop: 1 }} />
      <V2Text
        color={textColor}
        style={{ flex: 1, fontSize: 13, lineHeight: 20 }}
      >
        {summary}
      </V2Text>
    </V2HStack>
  )
}
