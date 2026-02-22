import { useRef, useEffect, useState } from "react"
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
  View,
  TextInput,
  Pressable,
  StyleSheet,
  useColorScheme,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams, useRouter } from "expo-router"

import type { ChatCategory } from "@/src/types/models"
import type { FaqCardEntry } from "@/src/features/consultation/types"

import {
  CATEGORY_LIST,
  MOCK_HISTORY_LIST,
  // getCategoryMeta,
} from "@/src/features/consultation/data/mockData"
import { useChat } from "@/src/features/consultation/hooks/useChat"

import { YStack, Text, XStack } from "tamagui"
import { Chip } from "@/src/shared/components/Chip"
import { Icon } from "@/src/shared/components/Icon"

import { ConsultChatHeader } from "@/src/features/consultation/components/ConsultChatHeader"
import {
  UserBubble,
  AssistantBubble,
} from "@/src/features/consultation/components/ChatMessageBubble"
import { TypingIndicator } from "@/src/features/consultation/components/TypingIndicator"
import { FaqCarousel } from "@/src/features/consultation/components/FaqCarousel"
import { CopyToast } from "@/src/features/consultation/components/CopyToast"
import { ChatHistorySheet } from "@/src/features/consultation/components/ChatHistorySheet"
import { useCopyToClipboard } from "@/src/features/consultation/hooks/useCpoyToClipboard"
import { ChatHistoryCard } from "@/src/features/consultation/components/ChatHistoryCard"

if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
  }
}

export default function ConsultScreen() {
  const params = useLocalSearchParams<{
    category: ChatCategory
    initialMessage?: string
  }>()

  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"
  const [message, setMessage] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<ChatCategory | null>(
    null,
  )
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const category = params.category ?? "diet"
  // const meta = getCategoryMeta(category)
  const scrollRef = useRef<ScrollView>(null)
  const { messages, isTyping, sendMessage, regenerateLastMessage } = useChat({
    category,
    initialMessage: params.initialMessage,
  })

  const router = useRouter()
  const handleHistoryPress = () => {
    setHistoryOpen(true)
  }
  const handleSharePress = () => {
    // @TODO: Implement share functionality
    // 채팅 초기화 방법 X
  }
  const handleNewChat = () => {
    setHistoryOpen(false)
    // @TODO: Reset conversation
  }
  const handleSelectHistory = (_id: string) => {
    // @TODO: Load selected conversation
  }

  const { handleCopy, showToast } = useCopyToClipboard()

  const handleInputFocus = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsInputFocused(true)
  }

  const handleInputBlur = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsInputFocused(false)
  }

  const handleFaqPress = (entry: FaqCardEntry) => {
    sendMessage(entry.description)
  }

  // Auto-scroll to bottom when new messages arrive or typing starts
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true })
    }, 100)
    return () => clearTimeout(timer)
  }, [messages.length, isTyping])

  return (
    <View
      style={{ flex: 1, backgroundColor: "#F3F3F3", paddingTop: insets.top }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ConsultChatHeader
          onHistoryPress={handleHistoryPress}
          onSharePress={handleSharePress}
        />

        {messages.length === 0 && !isTyping ? (
          <YStack flex={1} justifyContent="center" gap="$5">
            <Text
              textAlign="center"
              fontSize="18"
              lineHeight={20}
              fontWeight="600"
              color={isDarkMode ? "#E7E7EE" : "#2A2A37"}
            >
              {"신신당부 AI에게\n무엇이든 물어보세요"}
            </Text>
            {!isInputFocused && <FaqCarousel onFaqPress={handleFaqPress} />}
          </YStack>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 16, gap: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {(() => {
              const lastAssistantIdx = messages.findLastIndex(
                (m) => m.role === "assistant",
              )
              return messages.map((msg, index) =>
                msg.role === "user" ? (
                  <UserBubble key={msg.id} message={msg} />
                ) : (
                  <AssistantBubble
                    key={msg.id}
                    message={msg}
                    isLastAssistant={index === lastAssistantIdx}
                    onCopy={() => handleCopy(msg.content)}
                    onRegenerate={regenerateLastMessage}
                  />
                ),
              )
            })()}
            {isTyping && <TypingIndicator />}
          </ScrollView>
        )}

        {/* Bottom Composer */}
        <YStack
          backgroundColor="transparent"
          paddingVertical="8"
          paddingHorizontal="16"
        >
          {showToast && <CopyToast message="답변을 복사했습니다." />}
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

          <View
            style={{
              ...styles.inputContainer,
              backgroundColor: isDarkMode ? "#2E2E34" : "#FDFDFD",
            }}
          >
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="상담 내용을 작성하세요"
              placeholderTextColor={isDarkMode ? "#66666B" : "#81818D"}
              multiline
              style={{
                ...styles.input,
                color: isDarkMode ? "#E7E7EE" : "#2A2A37",
              }}
              editable={!isTyping}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />

            <XStack justifyContent="space-between" alignItems="center">
              <Pressable onPress={() => {}} hitSlop={8}>
                <Icon
                  name="plus"
                  size={24}
                  color={isDarkMode ? "#E7E7EE" : "#2A2A37"}
                />
              </Pressable>
              <Pressable
                onPress={() => sendMessage(message)}
                disabled={!message.trim() || isTyping}
                style={{
                  ...styles.sendButton,
                  backgroundColor:
                    message.trim() && !isTyping
                      ? isDarkMode
                        ? "#ABABB4"
                        : "#474758"
                      : isDarkMode
                        ? "#4E4F55"
                        : "#CACBD5",
                }}
              >
                <Icon
                  name="fly-chat"
                  size={24}
                  color={isDarkMode ? "#E7E7EE" : "#FDFDFD"}
                />
              </Pressable>
            </XStack>
          </View>
        </YStack>
      </KeyboardAvoidingView>
      <ChatHistorySheet.Layout isOpen={historyOpen}>
        <ChatHistorySheet.Header
          onNewChat={handleNewChat}
          onClose={() => setHistoryOpen(false)}
        />
        <ChatHistorySheet.ContentLayout>
          {MOCK_HISTORY_LIST.map((item) => (
            <ChatHistoryCard
              key={item.id}
              summary={item.summary}
              content={item.content}
              timestamp={item.timestamp.toISOString()}
              onPress={() => handleSelectHistory(item.id)}
              onRename={() => {}}
              onDelete={() => {}}
              onShare={() => {}}
            />
          ))}
        </ChatHistorySheet.ContentLayout>
      </ChatHistorySheet.Layout>
    </View>
  )
}

const styles = StyleSheet.create({
  input: {
    fontSize: 16,
    maxHeight: 120,
    lineHeight: 22,
    padding: 0,
    marginBottom: 8,
  },
  inputContainer: {
    marginBottom: 8,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
})
