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
      backgroundColor="$backgroundFocus"
      borderRadius="$6"
      paddingHorizontal="$5"
      paddingVertical="$4"
      gap="$3"
    >
      <Text
        fontSize={14}
        fontWeight="bold"
        backgroundColor="$background"
        paddingHorizontal="$3"
        paddingVertical="$1.5"
        borderRadius="$4"
        alignSelf="flex-start"
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.18}
        shadowRadius={6}
        elevation={4}
      >
        {title}
      </Text>
      <YStack gap="$3">{children}</YStack>
    </YStack>
  )
}
