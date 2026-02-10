import { useState, useCallback } from "react"
import { TextInput, Pressable, View } from "react-native"
import { XStack, YStack } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { tokens } from "@/src/theme/tokens"
import type { ChatCategory } from "@/src/types/models"
import { QuickQuestionChips } from "./QuickQuestionChips"

interface ChatComposerProps {
  category: ChatCategory
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatComposer({
  category,
  onSend,
  disabled,
}: ChatComposerProps) {
  const insets = useSafeAreaInsets()
  const [text, setText] = useState("")

  const handleSend = useCallback(() => {
    if (!text.trim() || disabled) return
    onSend(text.trim())
    setText("")
  }, [text, disabled, onSend])

  const handleChipSelect = useCallback(
    (chipText: string) => {
      if (disabled) return
      onSend(chipText)
    },
    [disabled, onSend],
  )

  return (
    <YStack
      borderTopWidth={1}
      borderTopColor="$borderColor"
      backgroundColor="$background"
      paddingBottom={insets.bottom}
    >
      {/* Quick Question Chips */}
      <QuickQuestionChips
        category={category}
        onSelect={handleChipSelect}
        disabled={disabled}
      />

      {/* Input Row */}
      <XStack
        paddingHorizontal="$3"
        paddingVertical="$2"
        gap="$2"
        alignItems="flex-end"
      >
        {/* Plus Button */}
        <Pressable
          onPress={() => {}}
          style={{
            width: 36,
            height: 36,
            marginBottom: 0,
            borderRadius: 18,
            backgroundColor: tokens.color.grey8.val,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="add" size={22} color={tokens.color.grey4.val} />
        </Pressable>

        {/* Text Input */}
        <View
          style={{
            flex: 1,
            minHeight: 36,
            maxHeight: 120,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: tokens.color.grey8.val,
            backgroundColor: tokens.color.pureWhite.val,
            paddingHorizontal: 14,
            paddingVertical: 8,
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="메시지를 입력하세요"
            placeholderTextColor={tokens.color.grey6.val}
            multiline
            style={{
              fontSize: 14,
              color: tokens.color.grey1.val,
              maxHeight: 100,
              lineHeight: 20,
              padding: 0,
            }}
            editable={!disabled}
          />
        </View>

        {/* Send Button */}
        <Pressable
          onPress={handleSend}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor:
              text.trim() && !disabled
                ? tokens.color.primary7.val
                : tokens.color.grey8.val,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={
              text.trim() && !disabled ? "#FFFFFF" : tokens.color.grey6.val
            }
          />
        </Pressable>
      </XStack>
    </YStack>
  )
}
