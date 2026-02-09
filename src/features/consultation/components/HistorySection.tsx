import { YStack, XStack, Text } from "tamagui"
import { Pressable } from "react-native"
import { tokens } from "@/src/theme/tokens"
import { HistoryCard } from "./HistoryCard"
import type { ConsultHistoryItem } from "../types"

interface HistorySectionProps {
  items: ConsultHistoryItem[]
  onItemPress: (id: string) => void
  onSeeAll: () => void
}

export function HistorySection({
  items,
  onItemPress,
  onSeeAll,
}: HistorySectionProps) {
  return (
    <YStack paddingHorizontal="$4" gap="$3">
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$5" fontWeight="700" color="$grey3">
          이전 대화
        </Text>
        <Pressable onPress={onSeeAll}>
          <Text fontSize="$4" color={tokens.color.sub7.val}>
            전체보기
          </Text>
        </Pressable>
      </XStack>

      <YStack gap="$3">
        {items.map((item) => (
          <HistoryCard key={item.id} item={item} onPress={onItemPress} />
        ))}
      </YStack>
    </YStack>
  )
}
