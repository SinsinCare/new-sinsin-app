import { ReactNode } from "react"
import { Text, XStack, YStack } from "tamagui"

interface RecordCardProps {
  icon: ReactNode
  title: string
  children: ReactNode
}

export function RecordCard({ icon, title, children }: RecordCardProps) {
  return (
    <XStack
      backgroundColor="$backgroundFocus"
      borderRadius="$6"
      paddingVertical="$4"
      paddingHorizontal="$4"
      gap="$3"
    >
      <XStack marginTop={-3}>{icon}</XStack>
      <YStack flex={1} gap="$2">
        <Text fontSize="$4" fontWeight="600" color="$gray12">
          {title}
        </Text>
        {children}
      </YStack>
    </XStack>
  )
}
