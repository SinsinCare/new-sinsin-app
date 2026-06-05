import { ScrollView, Pressable } from "react-native"
import { Text, XStack } from "tamagui"
import type { ChatCategory } from "@/src/types/chat"
import { QUICK_QUESTIONS } from "../data/mockData"

interface QuickQuestionChipsProps {
  category: ChatCategory
  onSelect: (text: string) => void
  disabled?: boolean
}

export function QuickQuestionChips({
  category,
  onSelect,
  disabled,
}: QuickQuestionChipsProps) {
  const questions = QUICK_QUESTIONS[category] ?? []

  if (questions.length === 0) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
      }}
    >
      {questions.map((q) => (
        <Pressable
          key={q.id}
          onPress={() => !disabled && onSelect(q.text)}
          style={{ opacity: disabled ? 0.5 : 1 }}
        >
          <XStack
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderRadius="$10"
            borderWidth={1}
            borderColor="$grey8"
            backgroundColor="$background"
          >
            <Text fontSize="$3" color="$grey3">
              {q.text}
            </Text>
          </XStack>
        </Pressable>
      ))}
    </ScrollView>
  )
}
