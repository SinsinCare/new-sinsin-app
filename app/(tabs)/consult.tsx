import { useRef, useEffect, useState } from "react"
import {
  Alert,
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
  Dimensions,
  Modal,
  GestureResponderEvent,
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import Animated, { FadeIn, FadeOut } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import type { Chat } from "@/src/types/chat"
import type { FaqCardEntry } from "@/src/features/consultation/types"

import { CATEGORY_LIST } from "@/src/features/consultation/data/mockData"
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
import { RenameModal } from "@/src/features/consultation/components/RenameModal"
import { chatApiService } from "@/src/services"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { chatHistoryQuery } from "@/src/features/consultation/data/queyOptions"
import { ChatHistoryCardSkeleton } from "@/src/features/consultation/components/ChatHistoryCardSkeleton"

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
  const [renameTarget, setRenameTarget] = useState<Chat | null>(null)
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [attachMenuPosition, setAttachMenuPosition] = useState({
    bottom: 0,
    left: 0,
  })

  const scrollRef = useRef<ScrollView>(null)
  const {
    conversationId,
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
  const queryClient = useQueryClient()

  const { data: chats, isFetching } = useQuery(chatHistoryQuery(historyOpen))

  const chatHistoryList: Chat[] = chats?.conversations ?? []

  const isIdle = messages.length === 0 && !isTyping
  const canSend = !!inputMessage.trim() && !isTyping && !isSending
  const menuTextColor = isDarkMode ? "#E7E7EE" : "#2A2A37"

  const handleHistoryPress = () => {
    Keyboard.dismiss()
    setHistoryOpen(true)
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

  const handleRenamePress = (item: Chat) => {
    setRenameTarget(item)
  }

  const handleRenameConfirm = async (newName: string) => {
    if (!renameTarget) return
    try {
      await chatApiService.renameChat(renameTarget.id, newName)
      queryClient.invalidateQueries({ queryKey: ["chat", "history"] })
    } catch (err) {
      console.error("Failed to rename conversation:", err)
    }
    setRenameTarget(null)
  }

  const handleDeletePress = (item: Chat) => {
    Alert.alert("상담 기록 삭제", "이 상담 기록을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await chatApiService.deleteChat(item.id)
            queryClient.invalidateQueries({ queryKey: ["chat", "history"] })
            if (item.id === conversationId) {
              resetChat()
            }
          } catch (err) {
            console.error("Failed to delete conversation:", err)
          }
        },
      },
    ])
  }

  const handlePlusPress = (e: GestureResponderEvent) => {
    const { pageY } = e.nativeEvent
    const screenHeight = Dimensions.get("window").height
    setAttachMenuPosition({ bottom: screenHeight - pageY + 8, left: 16 })
    setAttachMenuOpen(true)
  }

  const handlePhotoUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("권한 필요", "사진 접근 권한이 필요합니다.")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      sendMessage(`[사진 첨부]\n${result.assets[0].uri}`)
    }
  }

  const handleCameraUpload = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("권한 필요", "카메라 접근 권한이 필요합니다.")
      return
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 })
    if (!result.canceled && result.assets[0]) {
      sendMessage(`[사진 첨부]\n${result.assets[0].uri}`)
    }
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

  const [pendingFaqMessage, setPendingFaqMessage] = useState<string | null>(
    null,
  )

  const handleFaqPress = (entry: FaqCardEntry) => {
    setCategory(entry.category)
    setPendingFaqMessage(entry.description)
  }

  // category가 설정된 후 pending FAQ 메시지 전송
  useEffect(() => {
    if (pendingFaqMessage && category) {
      sendMessage(pendingFaqMessage)
      setPendingFaqMessage(null)
    }
  }, [pendingFaqMessage, category, sendMessage])

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
        backgroundColor: isDarkMode ? "#1F1F21" : "#FAFAFA",
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
          onNewChatPress={handleNewChat}
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
            {messages.map((msg) =>
              msg.role === "user" ? (
                <UserBubble key={msg.id} message={msg} />
              ) : (
                <AssistantBubble
                  key={msg.id}
                  message={msg}
                  // isLastAssistant={index === lastAssistantIdx}
                  onCopy={() => handleCopy(msg.content)}
                  onRegenerate={regenerateLastMessage}
                />
              ),
            )}
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
              {/* <Pressable onPress={handlePlusPress} hitSlop={8}>
                <Icon
                  name="plus"
                  size={24}
                  color={isDarkMode ? "#E7E7EE" : "#2A2A37"}
                />
              </Pressable> */}
              <View />
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
                  size={16}
                  color={isDarkMode ? "#E7E7EE" : "#FDFDFD"}
                />
              </Pressable>
            </XStack>
          </View>
        </YStack>
      </KeyboardAvoidingView>
      {/* Chat History Sheet */}
      <ChatHistorySheet.Layout
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      >
        <ChatHistorySheet.Header
          onNewChat={handleNewChat}
          onClose={() => setHistoryOpen(false)}
        />
        <ChatHistorySheet.ContentLayout>
          {isFetching ? (
            <>
              <ChatHistoryCardSkeleton />
              <ChatHistoryCardSkeleton />
              <ChatHistoryCardSkeleton />
            </>
          ) : (
            chatHistoryList.map((item) => (
              <ChatHistoryCard
                key={item.id}
                summary={item.title}
                content={item.summary ?? ""}
                timestamp={item.createdAt.toISOString()}
                onPress={() => handleSelectHistory(item.id)}
                onRename={() => handleRenamePress(item)}
                onDelete={() => handleDeletePress(item)}
              />
            ))
          )}
        </ChatHistorySheet.ContentLayout>
        <RenameModal
          visible={renameTarget !== null}
          currentName={renameTarget?.title ?? ""}
          onConfirm={handleRenameConfirm}
          onCancel={() => setRenameTarget(null)}
        />
      </ChatHistorySheet.Layout>
      {/* Attach Menu */}
      <Modal
        visible={attachMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAttachMenuOpen(false)}
      >
        <Pressable
          style={attachStyles.backdrop}
          onPress={() => setAttachMenuOpen(false)}
        >
          <View
            style={[
              attachStyles.menuCard,
              {
                bottom: attachMenuPosition.bottom,
                left: attachMenuPosition.left,
                backgroundColor: isDarkMode ? "#2E2E34" : "#FFFFFF",
                shadowOpacity: isDarkMode ? 0.4 : 0.15,
              },
            ]}
          >
            {/* 사진 업로드 */}
            <Pressable
              onPress={() => {
                setAttachMenuOpen(false)
                handlePhotoUpload()
              }}
              style={({ pressed }) => ({
                ...attachStyles.menuItem,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={[attachStyles.menuItemText, { color: menuTextColor }]}
              >
                사진 업로드
              </Text>
              <Icon name="gallery" size={20} color={menuTextColor} />
            </Pressable>

            {/* 카메라 촬영 */}
            <Pressable
              onPress={() => {
                setAttachMenuOpen(false)
                handleCameraUpload()
              }}
              style={({ pressed }) => ({
                ...attachStyles.menuItem,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={[attachStyles.menuItemText, { color: menuTextColor }]}
              >
                카메라 촬영
              </Text>
              <Icon name="paperclip" size={20} color={menuTextColor} />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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

const attachStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  menuCard: {
    position: "absolute",
    minWidth: 160,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "400",
  },
})
