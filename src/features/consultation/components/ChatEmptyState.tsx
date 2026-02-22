import { YStack, Text } from "tamagui"
import { FaqCarousel } from "./FaqCarousel"
import type { FaqCardEntry } from "../types"

interface ChatEmptyStateProps {
  onFaqPress: (entry: FaqCardEntry) => void
}

export function ChatEmptyState({ onFaqPress }: ChatEmptyStateProps) {
  return (
    <YStack flex={1} justifyContent="center" gap="$5">
      <Text
        textAlign="center"
        fontSize="$7"
        fontWeight="600"
        color="$grey2"
        lineHeight={28}
      >
        {"신신당부 AI에게\n무엇이든 물어보세요"}
      </Text>
      <FaqCarousel onFaqPress={onFaqPress} />
    </YStack>
  )
}
