import { useState, useCallback } from "react"
import { TextInput, Pressable, View } from "react-native"
import { XStack, YStack } from "tamagui"
import { Icon } from "@/src/shared/components"
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
      backgroundColor="transparent"
      paddingBottom={insets.bottom}
    >
      <QuickQuestionChips
        category={category}
        onSelect={handleChipSelect}
        disabled={disabled}
      />

      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 8,
          borderRadius: 20,
          backgroundColor: tokens.color.pureWhite.val,
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 10,
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="상담 내용을 작성하세요"
          placeholderTextColor={tokens.color.grey6.val}
          multiline
          style={{
            fontSize: 16,
            color: tokens.color.grey1.val,
            maxHeight: 120,
            lineHeight: 22,
            padding: 0,
            marginBottom: 8,
          }}
          editable={!disabled}
        />

        <XStack justifyContent="space-between" alignItems="center">
          <Pressable onPress={() => {}} hitSlop={8}>
            <Icon name="plus" size={22} color={tokens.color.grey4.val} />
          </Pressable>
          <Pressable
            onPress={handleSend}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor:
                text.trim() && !disabled
                  ? tokens.color.grey2.val
                  : tokens.color.grey7.val,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon
              name="fly-chat"
              size={20}
              color={tokens.color.pureWhite.val}
            />
          </Pressable>
        </XStack>
      </View>
    </YStack>
  )
}
