import { useRef, useEffect, useState } from "react"
import { ScrollView, KeyboardAvoidingView, Platform, LayoutAnimation, UIManager } from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams, useRouter } from "expo-router"

import type { ChatCategory } from "@/src/types/models"

import {
  CATEGORY_LIST,
  getCategoryMeta,
} from "@/src/features/consultation/data/mockData"
import { useChat } from "@/src/features/consultation/hooks/useChat"

import { YStack, Text } from "tamagui"
import { ConsultChatHeader } from "@/src/features/consultation/components/ConsultChatHeader"
import { ChatMessageBubble } from "@/src/features/consultation/components/ChatMessageBubble"
import { TypingIndicator } from "@/src/features/consultation/components/TypingIndicator"
import { ChatTextInput } from "@/src/features/consultation/components/ChatTextInput"
import { Chip } from "@/src/shared/components/Chip"

if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
  }
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{
    category: ChatCategory
    initialMessage?: string
  }>()

  const insets = useSafeAreaInsets()
  const [message, setMessage] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<ChatCategory | null>(
    null,
  )
  const [isInputFocused, setIsInputFocused] = useState(false)

  const category = params.category ?? "diet"
  const meta = getCategoryMeta(category)
  const scrollRef = useRef<ScrollView>(null)
  const { messages, isTyping, sendMessage, isSending } = useChat({
    category,
    initialMessage: params.initialMessage,
  })

  const router = useRouter()
  const handleHistoryPress = () => {}
  const handleClosePress = () => {
    router.navigate("/(tabs)/home")
  }

  const handleInputFocus = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsInputFocused(true)
  }

  const handleInputBlur = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsInputFocused(false)
  }

  // Auto-scroll to bottom when new messages arrive or typing starts
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true })
    }, 100)
    return () => clearTimeout(timer)
  }, [messages.length, isTyping])

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#F3F3F3" }}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ConsultChatHeader
          onHistoryPress={handleHistoryPress}
          onClosePress={handleClosePress}
        />

        {/* Chat Messages */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 16, gap: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <ChatMessageBubble key={msg.id} message={msg} />
          ))}
          {isTyping && <TypingIndicator />}
        </ScrollView>

        {/* Bottom Composer */}
        <YStack
          borderTopWidth={1}
          borderTopColor="$borderColor"
          backgroundColor="transparent"
          paddingBottom={insets.bottom}
          paddingHorizontal="16"
        >
          {isInputFocused && (
            <>
              <Text fontSize="12" color="#81818d" lineHeight={16}>
                카테고리
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 8, gap: 8 }}
              >
                {CATEGORY_LIST.map((category) => (
                  <Chip
                    key={category.key}
                    icon={category.icon}
                    label={category.label}
                    onPress={() => setSelectedCategory(category.key)}
                    isSelected={category.key === selectedCategory}
                  />
                ))}
              </ScrollView>
            </>
          )}
          <ChatTextInput
            placeholder="상담 내용을 작성하세요"
            value={message}
            onChangeText={setMessage}
            isInputDisabled={isTyping}
            isSendDisabled={isSending || isTyping}
            onPressSend={() => sendMessage(message)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </YStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
