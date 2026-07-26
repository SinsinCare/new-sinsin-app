import { useCallback, useRef, useEffect, useState } from "react"
import {
  Alert,
  FlatList,
  type ListRenderItemInfo,
  ScrollView,
  Platform,
  View,
  TextInput,
  Pressable,
  Keyboard,
  StyleSheet,
  Dimensions,
  Modal,
  GestureResponderEvent,
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import { useLocalSearchParams, useRouter } from "expo-router"
import Animated, { FadeIn, FadeOut } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import type { Chat, Message } from "@/src/types/chat"
import type { FaqCardEntry } from "@/src/features/consultation/types"

import { CATEGORY_LIST } from "@/src/features/consultation/data/mockData"
import { useChat } from "@/src/features/consultation/hooks/useChat"

import { YStack, Text } from "tamagui"
import { Chip } from "@/src/shared/components/Chip"
import { Icon } from "@/src/shared/components/Icon"
import { KeyboardAwareView } from "@/src/shared/components"
import { tokens } from "@/src/theme/tokens"

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
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"

type FoodConsultSearchParams = {
  foodConsultContext?: string | string[]
  foodConsultRequestId?: string | string[]
}

interface FoodConsultContext {
  foodAnalysisResultId?: number
  mealType?: string
  mealLabel?: string
  title?: string
  servings?: number
  total?: {
    calories?: number
    carbohydrates?: number
    protein?: number
    fat?: number
    sodium?: number
    potassium?: number
    phosphorus?: number
    water?: number
  }
  comment?: string
  cautionFoods?: {
    food?: string
    reason?: string
  }[]
  foods?: {
    name?: string
    servingSizeValue?: number | null
    servingSizeUnit?: string
    restrictionLevel?: string
    nutritionStatus?: string
    calories?: number
    carbohydrates?: number
    protein?: number
    fat?: number
    sodium?: number
    potassium?: number
    phosphorus?: number
    water?: number
  }[]
}

const FOOD_CONSULT_MESSAGE_MAX_LENGTH = 4800

function getParamString(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function parseFoodConsultContext(raw: string): FoodConsultContext | null {
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    return parsed as FoodConsultContext
  } catch {
    return null
  }
}

function formatNutrient(value: unknown, unit: string): string | null {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value)}${unit}`
    : null
}

function buildFoodConsultMessage(context: FoodConsultContext): string {
  const title = context.title?.trim() || "분석한 식사"
  const mealLabel = context.mealLabel ?? context.mealType
  const total = context.total ?? {}
  const totalLine = [
    formatNutrient(total.calories, "kcal"),
    formatNutrient(total.carbohydrates, "g 탄수화물"),
    formatNutrient(total.protein, "g 단백질"),
    formatNutrient(total.fat, "g 지방"),
    formatNutrient(total.sodium, "mg 나트륨"),
    formatNutrient(total.potassium, "mg 칼륨"),
    formatNutrient(total.phosphorus, "mg 인"),
    formatNutrient(total.water, "ml 수분"),
  ]
    .filter(Boolean)
    .join(", ")

  const foodsLine =
    context.foods
      ?.slice(0, 8)
      .map((food) => {
        const serving =
          food.servingSizeValue != null && food.servingSizeUnit
            ? ` ${food.servingSizeValue}${food.servingSizeUnit}`
            : ""
        const nutrition = [
          formatNutrient(food.calories, "kcal"),
          formatNutrient(food.sodium, "mg 나트륨"),
          formatNutrient(food.potassium, "mg 칼륨"),
          formatNutrient(food.phosphorus, "mg 인"),
        ]
          .filter(Boolean)
          .join(", ")
        const status =
          food.nutritionStatus === "PENDING" ? "영양 재계산 대기" : undefined
        const restriction = food.restrictionLevel
          ? `주의도 ${food.restrictionLevel}`
          : undefined
        return `- ${food.name ?? "음식"}${serving}: ${[
          nutrition,
          restriction,
          status,
        ]
          .filter(Boolean)
          .join(", ")}`
      })
      .join("\n") ?? ""

  const cautionsLine =
    context.cautionFoods
      ?.slice(0, 5)
      .map(
        (item) =>
          `- ${item.food ?? "주의 음식"}: ${item.reason ?? "주의가 필요합니다."}`,
      )
      .join("\n") ?? ""

  return [
    "아래 식단 분석 결과를 바탕으로 신장 건강 관점에서 주의할 점과 다음 식사 조절법을 알려주세요.",
    "",
    `[식단] ${title}`,
    mealLabel ? `[끼니] ${mealLabel}` : null,
    context.foodAnalysisResultId
      ? `[분석결과 ID] ${context.foodAnalysisResultId}`
      : null,
    context.servings ? `[분량] ${context.servings}인분` : null,
    totalLine ? `[총 영양] ${totalLine}` : null,
    context.comment ? `[분석 한줄평] ${context.comment}` : null,
    foodsLine ? `[음식별 정보]\n${foodsLine}` : null,
    cautionsLine ? `[주의 음식]\n${cautionsLine}` : null,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, FOOD_CONSULT_MESSAGE_MAX_LENGTH)
}

// ScrollView 시절 contentContainerStyle 의 gap:16 을 대체합니다.
// FlatList 는 셀을 개별 마운트하므로 간격을 구분자로 넣습니다.
function MessageSeparator() {
  return <View style={{ height: 16 }} />
}

export default function ConsultScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const foodConsultParams = useLocalSearchParams<FoodConsultSearchParams>()
  const colorScheme = useAppColorScheme()
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

  const listRef = useRef<FlatList<Message>>(null)
  const keyboardHideRestoreTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
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
  const menuTextColor = isDarkMode
    ? tokens.color.textDark.val
    : tokens.color.textLight.val

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

  // FlatList 로 넘기는 prop 들은 렌더마다 새로 만들면 안 됩니다.
  // 새 참조가 가면 FlatList 가 셀을 통째로 다시 그립니다.
  const keyExtractor = useCallback((msg: Message) => String(msg.id), [])
  const renderMessage = useCallback(
    ({ item }: ListRenderItemInfo<Message>) =>
      item.role === "user" ? (
        <UserBubble message={item} />
      ) : (
        <AssistantBubble
          message={item}
          onCopy={handleCopy}
          onRegenerate={regenerateLastMessage}
        />
      ),
    [handleCopy, regenerateLastMessage],
  )

  const handleInputFocus = () => {
    if (keyboardHideRestoreTimerRef.current) {
      clearTimeout(keyboardHideRestoreTimerRef.current)
      keyboardHideRestoreTimerRef.current = null
    }
    setIsInputFocused(true)
  }

  const handleInputBlur = () => {
    if (Platform.OS === "android") {
      return
    }
    setIsInputFocused(false)
  }

  const [pendingFaqMessage, setPendingFaqMessage] = useState<string | null>(
    null,
  )
  const [pendingFoodConsultMessage, setPendingFoodConsultMessage] = useState<
    string | null
  >(null)
  const handledFoodConsultRequestRef = useRef<string | null>(null)

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

  useEffect(() => {
    const rawContext = getParamString(foodConsultParams.foodConsultContext)
    if (!rawContext) return

    const requestId =
      getParamString(foodConsultParams.foodConsultRequestId) ?? rawContext
    if (handledFoodConsultRequestRef.current === requestId) return

    const context = parseFoodConsultContext(rawContext)
    if (!context) return

    handledFoodConsultRequestRef.current = requestId
    resetChat()
    setInputMessage("")
    setCategory("FOOD_DIET")
    setPendingFoodConsultMessage(buildFoodConsultMessage(context))
  }, [
    foodConsultParams.foodConsultContext,
    foodConsultParams.foodConsultRequestId,
    resetChat,
    setCategory,
  ])

  useEffect(() => {
    if (pendingFoodConsultMessage && category === "FOOD_DIET") {
      sendMessage(pendingFoodConsultMessage)
      setPendingFoodConsultMessage(null)
    }
  }, [pendingFoodConsultMessage, category, sendMessage])

  const handleSend = () => {
    sendMessage(inputMessage)
    setInputMessage("")
  }

  // Auto-scroll to bottom when new messages arrive or typing starts
  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true })
    }, 100)
    return () => clearTimeout(timer)
  }, [messages.length, isTyping])

  useEffect(() => {
    if (Platform.OS !== "android") {
      return
    }

    const keyboardDidHide = Keyboard.addListener("keyboardDidHide", () => {
      keyboardHideRestoreTimerRef.current = setTimeout(() => {
        setIsInputFocused(false)
        keyboardHideRestoreTimerRef.current = null
      }, 120)
    })

    return () => {
      keyboardDidHide.remove()
      if (keyboardHideRestoreTimerRef.current) {
        clearTimeout(keyboardHideRestoreTimerRef.current)
        keyboardHideRestoreTimerRef.current = null
      }
    }
  }, [])

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDarkMode
          ? tokens.color.appBgDark.val
          : tokens.color.appBg.val,
        paddingTop: insets.top,
      }}
    >
      <KeyboardAwareView keyboardVerticalOffset={0}>
        <ConsultChatHeader
          onHistoryPress={handleHistoryPress}
          onNewChatPress={handleNewChat}
        />

        {isIdle ? (
          <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
            <YStack flex={1} justifyContent="center" gap="$5">
              <Text
                textAlign="center"
                fontSize={18}
                lineHeight={20}
                fontWeight="600"
                color={
                  isDarkMode
                    ? tokens.color.textDark.val
                    : tokens.color.textLight.val
                }
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
              <YStack alignItems="center" gap={4} paddingHorizontal={24}>
                <Text
                  fontSize={11}
                  color={
                    isDarkMode
                      ? tokens.color.textLightMuted.val
                      : tokens.color.textLightSub.val
                  }
                  textAlign="center"
                  lineHeight={16}
                >
                  AI 답변은 참고용 정보입니다. 정확한 진단·치료는 반드시 전문
                  의료인과 상담하세요.
                </Text>
                <Text
                  fontSize={11}
                  color={isDarkMode ? "#5BC5AB" : "#0D896A"}
                  fontWeight="500"
                  onPress={() => router.push("/(settings)/medical-reference")}
                >
                  📚 의학 참고 문헌 보기
                </Text>
              </YStack>
            </YStack>
          </Pressable>
        ) : (
          <FlatList
            ref={listRef}
            style={{ flex: 1 }}
            data={messages}
            keyExtractor={keyExtractor}
            renderItem={renderMessage}
            ItemSeparatorComponent={MessageSeparator}
            ListFooterComponent={isTyping ? <TypingIndicator /> : null}
            contentContainerStyle={{ paddingVertical: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            // 말풍선은 높이가 제각각이라 getItemLayout 을 줄 수 없습니다.
            // 화면에 보이는 만큼만 유지하도록 창을 좁게 잡습니다.
            initialNumToRender={12}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews
          />
        )}

        {/* Bottom Composer */}
        <YStack
          backgroundColor="transparent"
          paddingVertical={8}
          paddingHorizontal={16}
        >
          {showToast && <CopyToast message="답변을 복사했습니다." />}
          {isIdle && isInputFocused && (
            <>
              <Text fontSize={12} color="#81818d" lineHeight={16}>
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
              backgroundColor: isDarkMode
                ? tokens.color.inputBgDark.val
                : "#F2F2F5",
            }}
          >
            <Pressable
              onPress={handlePlusPress}
              disabled={isTyping}
              accessibilityRole="button"
              accessibilityLabel="상담 첨부 메뉴 열기"
              style={({ pressed }) => ({
                ...styles.attachButton,
                opacity: pressed ? 0.6 : isTyping ? 0.4 : 1,
              })}
            >
              <Icon name="paperclip" size={20} color={menuTextColor} />
            </Pressable>

            <TextInput
              value={inputMessage}
              onChangeText={setInputMessage}
              placeholder="상담 내용을 작성하세요"
              placeholderTextColor={isDarkMode ? "#66666B" : "#81818D"}
              multiline
              style={{
                ...styles.input,
                color: isDarkMode
                  ? tokens.color.textDark.val
                  : tokens.color.textLight.val,
              }}
              editable={!isTyping}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />

            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              style={{
                ...styles.sendButton,
                backgroundColor: canSend
                  ? isDarkMode
                    ? tokens.color.textDarkSub.val
                    : "#474758"
                  : isDarkMode
                    ? "#4E4F55"
                    : "#CACBD5",
              }}
            >
              <Icon
                name="fly-chat"
                size={16}
                color={
                  isDarkMode
                    ? tokens.color.textDark.val
                    : tokens.color.offWhite.val
                }
              />
            </Pressable>
          </View>
        </YStack>
      </KeyboardAwareView>
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
                backgroundColor: isDarkMode
                  ? tokens.color.inputBgDark.val
                  : tokens.color.pureWhite.val,
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
    flex: 1,
    fontSize: 16,
    includeFontPadding: false,
    minHeight: 32,
    maxHeight: 120,
    lineHeight: 22,
    padding: 0,
    paddingVertical: 5,
    textAlignVertical: "center",
  },
  inputContainer: {
    marginBottom: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  attachButton: {
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
