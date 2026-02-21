import { useState, useCallback } from "react"
import { TextInput, Pressable, View } from "react-native"
import { XStack, YStack } from "tamagui"
import { Icon } from "@/src/shared/components"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { tokens } from "@/src/theme/tokens"
import type { ChatCategory } from "@/src/types/models"
import { QuickQuestionChips } from "./QuickQuestionChips"

interface ChatTextInputProps {
  placeholder: string
  value: string
  isSendDisabled: boolean
  isInputDisabled: boolean
  onChangeText: (text: string) => void
  onPressSend: () => void
  onFocus?: () => void
  onBlur?: () => void
}

export function ChatTextInput({
  placeholder,
  value,
  onChangeText,
  isInputDisabled,
  isSendDisabled,
  onPressSend,
  onFocus,
  onBlur,
}: ChatTextInputProps) {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={{
        marginBottom: 8,
        borderRadius: 20,
        backgroundColor: tokens.color.pureWhite.val,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 10,
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
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
        editable={!isInputDisabled}
        onFocus={onFocus}
        onBlur={onBlur}
      />

      <XStack justifyContent="space-between" alignItems="center">
        <Pressable onPress={() => {}} hitSlop={8}>
          <Icon name="plus" size={22} color={tokens.color.grey4.val} />
        </Pressable>
        <Pressable
          onPress={onPressSend}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor:
              value.trim() && !isSendDisabled
                ? tokens.color.grey2.val
                : tokens.color.grey7.val,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="fly-chat" size={20} color={tokens.color.pureWhite.val} />
        </Pressable>
      </XStack>
    </View>
  )
}
