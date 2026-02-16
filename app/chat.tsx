import { useRef, useEffect } from "react"
import { ScrollView, KeyboardAvoidingView, Platform } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useLocalSearchParams } from "expo-router"

import type { ChatCategory } from "@/src/types/models"
import { getCategoryMeta } from "@/src/features/consultation/data/mockData"
import { useChat } from "@/src/features/consultation/hooks/useChat"
import { ChatHeader } from "@/src/features/consultation/components/ChatHeader"
import { ChatMessageBubble } from "@/src/features/consultation/components/ChatMessageBubble"
import { TypingIndicator } from "@/src/features/consultation/components/TypingIndicator"
import { ChatComposer } from "@/src/features/consultation/components/ChatComposer"

export default function ChatScreen() {
  const params = useLocalSearchParams<{
    category: ChatCategory
    initialMessage?: string
  }>()
  const category = params.category ?? "diet"
  const meta = getCategoryMeta(category)
  const scrollRef = useRef<ScrollView>(null)

  const { messages, isTyping, sendMessage, isSending } = useChat({
    category,
    initialMessage: params.initialMessage,
  })

  // Auto-scroll to bottom when new messages arrive or typing starts
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true })
    }, 100)
    return () => clearTimeout(timer)
  }, [messages.length, isTyping])

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#f8f9fa" }}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ChatHeader title={meta?.label ?? category} />

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
        <ChatComposer
          category={category}
          onSend={sendMessage}
          disabled={isSending}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
