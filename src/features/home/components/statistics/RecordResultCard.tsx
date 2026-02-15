import { ReactNode } from "react"
import { TouchableOpacity } from "react-native"
import { Text, XStack, YStack } from "tamagui"
import { Ionicons } from "@expo/vector-icons"

interface RecordResultCardProps {
  type: string
  title: string
  onReset?: () => void
  children: ReactNode
}

export function RecordResultCard({
  type,
  title,
  onReset,
  children,
}: RecordResultCardProps) {
  return (
    <XStack
      backgroundColor="$backgroundFocus"
      borderRadius="$6"
      paddingVertical="$4"
      paddingHorizontal="$4"
      gap="$3"
    >
      <YStack flex={1} gap="$1">
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$4" fontWeight="600" color="$gray12">
            {title}
          </Text>
          {onReset && (
            <TouchableOpacity onPress={onReset}>
              <XStack alignItems="center" gap={2}>
                <Text fontSize="$3" color="$color.grey5">
                  되돌리기
                </Text>
                <Ionicons name="refresh" size={14} color="#999" />
              </XStack>
            </TouchableOpacity>
          )}
        </XStack>
        {children}
      </YStack>
    </XStack>
  )
}
