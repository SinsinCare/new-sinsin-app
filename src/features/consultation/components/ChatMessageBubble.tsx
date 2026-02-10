import { YStack, Text } from "tamagui"
import { GlassmorphicCard } from "@/src/shared/components/GlassmorphicCard"
import type { ChatMessage } from "@/src/types/models"

interface ChatMessageBubbleProps {
  message: ChatMessage
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <YStack alignItems="flex-end" paddingHorizontal="$4">
      <YStack
        backgroundColor="$primary7"
        borderRadius="$5"
        borderBottomRightRadius="$1"
        paddingHorizontal="$3"
        paddingVertical="$2.5"
        maxWidth="80%"
      >
        <Text fontSize="$4" color="white" lineHeight={22}>
          {message.content}
        </Text>
      </YStack>
      <Text fontSize={11} color="$grey6" marginTop="$1" paddingRight="$1">
        {formatTime(message.createdAt)}
      </Text>
    </YStack>
  )
}

function AssistantBubble({ message }: { message: ChatMessage }) {
  return (
    <YStack alignItems="flex-start" paddingHorizontal="$4" maxWidth="85%">
      <GlassmorphicCard variant="flat" borderColor="$borderColor" padding="$3">
        <Text fontSize="$4" color="$color" lineHeight={22}>
          {message.content}
        </Text>
      </GlassmorphicCard>
      <Text fontSize={11} color="$grey6" marginTop="$1" paddingLeft="$1">
        {formatTime(message.createdAt)}
      </Text>
    </YStack>
  )
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  if (message.role === "user") {
    return <UserBubble message={message} />
  }
  return <AssistantBubble message={message} />
}
