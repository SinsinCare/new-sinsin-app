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
  Keyboard,
  StyleSheet,
  useColorScheme,
} from "react-native"
import Animated, { FadeIn, FadeOut } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import type { FaqCardEntry } from "@/src/features/consultation/types"

import {
  CATEGORY_LIST,
  MOCK_HISTORY_LIST,
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
import { useCopyToClipboard } from "@/src/features/consultation/hooks/useCopyToClipboard"
import { ChatHistoryCard } from "@/src/features/consultation/components/ChatHistoryCard"

if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
  }
}

export default function ConsultScreen() {
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"
  const [inputMessage, setInputMessage] = useState("")
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const scrollRef = useRef<ScrollView>(null)
  const {
    messages,
    isTyping,
    isSending,
    category,
    setCategory,
    sendMessage,
    loadConversation,
    resetChat,
    regenerateLastMessage,
  } = useChat()

  const isIdle = messages.length === 0 && !isTyping
  const canSend = !!inputMessage.trim() && !!category && !isTyping && !isSending

  const handleHistoryPress = () => {
    Keyboard.dismiss()
    setHistoryOpen(true)
  }
  const handleSharePress = () => {
    Keyboard.dismiss()
  }
  const handleNewChat = () => {
    setHistoryOpen(false)
    setInputMessage("")
    resetChat()
  }
  const handleSelectHistory = (id: number) => {
    setHistoryOpen(false)
    setInputMessage("")
    loadConversation(id)
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
    setCategory(entry.category)
    sendMessage(entry.description)
  }

  const handleSend = () => {
    sendMessage(inputMessage)
    setInputMessage("")
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
      style={{
        flex: 1,
        backgroundColor: isDarkMode ? "#1F1F21" : "#F3F3F3",
        paddingTop: insets.top,
      }}
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

        {isIdle ? (
          <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
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
              {!isInputFocused && (
                <Animated.View
                  entering={FadeIn.duration(300)}
                  exiting={FadeOut.duration(200)}
                >
                  <FaqCarousel onFaqPress={handleFaqPress} />
                </Animated.View>
              )}
            </YStack>
          </Pressable>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 16, gap: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
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
          {isIdle && isInputFocused && (
            <>
              <Text fontSize="12" color="#81818d" lineHeight={16}>
                카테고리
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 8, gap: 8 }}
                keyboardShouldPersistTaps="always"
              >
                {CATEGORY_LIST.map((cat) => (
                  <Chip
                    key={cat.key}
                    icon={cat.icon}
                    label={cat.label}
                    onPress={() => setCategory(cat.key)}
                    isSelected={cat.key === category}
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
              value={inputMessage}
              onChangeText={setInputMessage}
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
                onPress={handleSend}
                disabled={!canSend}
                style={{
                  ...styles.sendButton,
                  backgroundColor: canSend
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
      <ChatHistorySheet.Layout
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      >
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
              onPress={() => handleSelectHistory(Number(item.id.split("-")[1]))}
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
