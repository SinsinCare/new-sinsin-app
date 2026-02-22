import { Pressable } from "react-native"
import { YStack, Text, XStack, View } from "tamagui"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Icon } from "@/src/shared/components/Icon"
import type { ChatMessage } from "@/src/types/models"

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function AssistantAvatar() {
  return (
    <View
      width={36}
      height={36}
      borderRadius={18}
      backgroundColor="$grey8"
      marginTop="$1"
    />
  )
}

export function UserBubble({ message }: { message: ChatMessage }) {
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"
  return (
    <XStack
      justifyContent="flex-end"
      alignItems="flex-end"
      paddingHorizontal="$4"
      gap="$1.5"
    >
      <Text fontSize={11} color="$grey6">
        {formatTime(message.createdAt)}
      </Text>
      <YStack
        backgroundColor={isDarkMode ? "#2E2E34" : "#FDFDFD"}
        borderRadius="$6"
        borderBottomRightRadius="1"
        paddingHorizontal="$3"
        paddingVertical="$2.5"
        maxWidth="70%"
      >
        <Text
          fontSize="$4"
          color={isDarkMode ? "#E7E7EE" : "#2A2A37"}
          lineHeight={22}
        >
          {message.content}
        </Text>
      </YStack>
    </XStack>
  )
}

export function AssistantBubble({
  message,
  isLastAssistant,
  onCopy,
  onRegenerate,
}: {
  message: ChatMessage
  isLastAssistant?: boolean
  onCopy?: () => void
  onRegenerate?: () => void
}) {
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"
  const iconColor = isDarkMode ? "#66666B" : "#A5A5AF"

  return (
    <XStack paddingHorizontal="$4" gap="$2.5" alignItems="flex-start">
      <AssistantAvatar />
      <YStack flex={1} gap="$2">
        <Text
          fontSize="$4"
          color={isDarkMode ? "#E7E7EE" : "#2A2A37"}
          lineHeight={22}
        >
          {message.content}
        </Text>
        {isLastAssistant && (
          <XStack gap="$3">
            <Pressable onPress={onCopy} hitSlop={8}>
              <Icon name="copy" size={20} color={iconColor} />
            </Pressable>
            <Pressable onPress={onRegenerate} hitSlop={8}>
              <Icon name="reset" size={20} color={iconColor} />
            </Pressable>
          </XStack>
        )}
      </YStack>
    </XStack>
  )
}
