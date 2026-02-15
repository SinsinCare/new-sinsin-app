import { XStack, YStack, Text } from "tamagui"
import { Pressable, View } from "react-native"
import { GlassmorphicCard } from "@/src/shared/components/GlassmorphicCard"
import { getCategoryMeta } from "../data/mockData"
import type { ConsultHistoryItem } from "../types"

interface HistoryCardProps {
  item: ConsultHistoryItem
  onPress: (id: string) => void
  showAnswer?: boolean
}

function formatTimestamp(date: Date): string {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)

  if (date.getTime() >= todayStart.getTime()) {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const period = hours < 12 ? "오전" : "오후"
    const displayHour = hours % 12 === 0 ? 12 : hours % 12
    const displayMinute = String(minutes).padStart(2, "0")
    return `${period} ${displayHour}:${displayMinute}`
  }

  if (date.getTime() >= yesterdayStart.getTime()) {
    return "어제"
  }

  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  return `${diffDays}일 전`
}

export function HistoryCard({
  item,
  onPress,
  showAnswer = false,
}: HistoryCardProps) {
  const meta = getCategoryMeta(item.category)

  return (
    <Pressable
      onPress={() => onPress(item.id)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <GlassmorphicCard variant="flat" padding="$3" borderColor="$borderColor">
        <YStack gap="$2">
          <XStack justifyContent="space-between" alignItems="center">
            <Text
              fontWeight="600"
              fontSize="$4"
              color="$color"
              flex={1}
              numberOfLines={1}
            >
              {item.firstQuestion}
            </Text>
            <Text fontSize="$3" color="$grey6" marginLeft="$2">
              {formatTimestamp(item.timestamp)}
            </Text>
          </XStack>
          {showAnswer && item.firstAnswer ? (
            <Text
              fontSize="$3"
              color="$grey5"
              numberOfLines={2}
              lineHeight={18}
            >
              {item.firstAnswer}
            </Text>
          ) : (
            <XStack gap="$2" alignItems="center">
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: meta?.color ?? "#999",
                }}
              />
              <Text fontSize="$3" color="$grey5">
                {meta?.label ?? item.category}
              </Text>
            </XStack>
          )}
        </YStack>
      </GlassmorphicCard>
    </Pressable>
  )
}
