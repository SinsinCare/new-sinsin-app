import { YStack, Text } from "tamagui"

interface DietaryGuideContainerProps {
  title: string
  children: React.ReactNode
}

export function DietaryGuideContainer({
  title,
  children,
}: DietaryGuideContainerProps) {
  return (
    <YStack
      backgroundColor="$cardBackground"
      borderRadius="$6"
      paddingHorizontal="$5"
      paddingVertical="$5"
      gap="$3"
    >
      <Text
        fontSize={title === "한줄평" ? 14 : 16}
        fontWeight={600}
        paddingVertical="$1"
        color={title === "한줄평" ? "$colorSubtle" : "$color"}
      >
        {title}
      </Text>
      <YStack gap="$3">{children}</YStack>
    </YStack>
  )
}
