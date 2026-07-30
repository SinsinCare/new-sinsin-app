import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, Text } from "tamagui"

interface DietaryGuideContainerProps {
  title: string
  isSummary?: boolean
  children: React.ReactNode
}

export function DietaryGuideContainer({
  title,
  isSummary = false,
  children,
}: DietaryGuideContainerProps) {
  const isDarkMode = useAppColorScheme() === "dark"

  return (
    <YStack
      backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
      borderRadius="$6"
      paddingHorizontal="$5"
      paddingVertical="$5"
      gap="$3"
    >
      <Text
        fontSize={isSummary ? 14 : 16}
        fontWeight={600}
        paddingVertical="$1"
        color={isSummary ? "$colorSubtle" : isDarkMode ? "$textDark" : "$color"}
      >
        {title}
      </Text>
      <YStack gap="$3">{children}</YStack>
    </YStack>
  )
}
