import { FeatureIntroSheet, useFeatureIntro } from "@/src/features/coach"
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
  LayoutAnimation,
  StyleSheet,
  Dimensions,
  GestureResponderEvent,
  Linking,
} from "react-native"
import { Image as ExpoImage } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"
import Animated, { FadeIn, FadeOut } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import type { Chat, ChatCategory, Message } from "@/src/types/chat"
import { CHAT_CATEGORIES } from "@/src/types/chat"
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
import {
  buildFoodConsultMessage,
  parseFoodConsultContext,
} from "@/src/features/consultation/utils/foodConsultMessage"
import {
  buildExamConsultMessage,
  parseExamConsultContext,
} from "@/src/features/consultation/utils/examConsultMessage"
import { RenameModal } from "@/src/features/consultation/components/RenameModal"
import { chatApiService } from "@/src/services"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { chatHistoryQuery } from "@/src/features/consultation/data/queyOptions"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { useTranslation } from "react-i18next"
import { getAppLanguage } from "@/src/i18n"

type FoodConsultSearchParams = {
  foodConsultContext?: string | string[]
  foodConsultRequestId?: string | string[]
  /**
   * 범용 질문 주입.
   *
   * `foodConsultContext` 는 **식사 전용**이다 — 빌더가 붙이는 문장이
   * `consult.mealPrompt`("이 식사의 영양 수치를…")로 고정돼 있어서, 검사 수치 질문을 그리로
   * 흘리면 모델에게 "이 식사" 를 묻게 된다. 그래서 프롬프트를 그대로 받는 통로를 따로 둔다.
   *
   * - `consultPrompt`  보낼 문장 원문
   * - `consultCategory` 대화 분류(`ChatCategory`). 검사 수치는 "EXAM".
   * - `consultRequestId` 재주입 방지 키. **반드시 매번 다른 값**을 줘야 한다 —
   *   없으면 프롬프트 문자열 자체가 키가 되어, 같은 질문을 두 번 누르면 두 번째가 조용히 무시된다.
   */
  consultPrompt?: string | string[]
  consultCategory?: string | string[]
  consultRequestId?: string | string[]
  /**
   * 건강검진 "질문하기" — 화면이 보고 있던 **수치를 통째로** 실어 보낸다.
   * (JSON. `ExamConsultContext`)
   *
   * `consultPrompt` 만으로는 부족하다: 문장만 보내면 모델이 "결과지를 아직 보지 못해
   * 구체적인 내용을 알기 어려워요" 라고 되묻는다 — 상담 컨텍스트 빌더가 검사 수치를
   * 주입하지 않기 때문이다. 화면이 이미 들고 있는 값을 그대로 넘겨서 그 왕복을 없앤다.
   */
  examConsultContext?: string | string[]
  examConsultRequestId?: string | string[]
}

function getParamString(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

// ScrollView 시절 contentContainerStyle 의 gap 을 대체합니다.
// FlatList 는 셀을 개별 마운트하므로 간격을 구분자로 넣습니다.
// 버블 없는 AI 답변에선 이 여백이 곧 화자 구분선이라 넉넉히 잡습니다.
function MessageSeparator() {
  return <View style={{ height: 24 }} />
}

export default function ConsultScreen() {
  // 첫 진입 안내 — 무엇을 물을 수 있는지와 진료 한계를 먼저 말한다.
  const consultIntro = useFeatureIntro("consult")
  const { t, i18n } = useTranslation("common")
  const language = (i18n.resolvedLanguage ?? i18n.language).startsWith("en")
    ? "en"
    : "ko"
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
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
  /** 전송 전 인풋에 얹어 둔 첨부 사진. X로 취소할 수 있다. */
  const [attachedImageUri, setAttachedImageUri] = useState<string | null>(null)
  /**
   * 컴포저 하단 인셋을 걷을 기준은 포커스가 아니라 실제 키보드다.
   * 하드웨어 키보드(시뮬레이터·외장 키보드)에선 포커스돼도 키보드가 없어서
   * 포커스 기준이면 여백만 꺼지는 시프트가 보인다.
   */
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)

  const listRef = useRef<FlatList<Message>>(null)
  // 스트리밍 자동 추적용 — 바닥에서 120pt 안에 있을 때만 따라간다.
  const isNearBottomRef = useRef(true)
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

  const { data: chats, isFetching } = useQuery(
    chatHistoryQuery(historyOpen, language),
  )

  const chatHistoryList: Chat[] = chats?.conversations ?? []

  const isIdle = messages.length === 0 && !isTyping
  const canSend =
    (!!inputMessage.trim() || !!attachedImageUri) && !isTyping && !isSending
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
    Alert.alert(t("consult.deleteTitle"), t("consult.deleteBody"), [
      { text: t("action.cancel"), style: "cancel" },
      {
        text: t("action.delete"),
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

  // 사진은 바로 보내지 않는다 — 인풋에 얹어 두고, 취소하거나 말과 함께 보낸다.
  const attachImage = (uri: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setAttachedImageUri(uri)
  }

  const clearAttachedImage = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setAttachedImageUri(null)
  }

  const handlePhotoUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert(
        t("consult.photoPermissionTitle"),
        t("consult.photoPermissionBody"),
        [
          { text: t("action.cancel"), style: "cancel" },
          {
            text: t("consult.openSettings"),
            onPress: () => void Linking.openSettings(),
          },
        ],
      )
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      attachImage(result.assets[0].uri)
    }
  }

  const handleCameraUpload = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== "granted") {
      Alert.alert(
        t("consult.cameraPermissionTitle"),
        t("consult.cameraPermissionBody"),
        [
          { text: t("action.cancel"), style: "cancel" },
          {
            text: t("consult.openSettings"),
            onPress: () => void Linking.openSettings(),
          },
        ],
      )
      return
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 })
    if (!result.canceled && result.assets[0]) {
      attachImage(result.assets[0].uri)
    }
  }

  const { handleCopy, showToast } = useCopyToClipboard()

  // FlatList 로 넘기는 prop 들은 렌더마다 새로 만들면 안 됩니다.
  // 새 참조가 가면 FlatList 가 셀을 통째로 다시 그립니다.
  // 키는 id+index 복합 — 낙관 id 카운터가 리셋(fast refresh 등)돼 id 가
  // 겹쳐도 React 중복 키가 나지 않게 마지막 방어선을 둔다.
  const keyExtractor = useCallback(
    (msg: Message, index: number) => `${msg.id}:${index}`,
    [],
  )
  // 재생성 버튼은 마지막 답변에만 — 지난 답변에 달면 누른 자리는 그대로 남고
  // 맨 아래에 새 답변이 붙는다(폴백이 새 답변과 나란히 남던 원인).
  const lastAssistantId =
    messages.findLast((msg) => msg.role === "assistant")?.id ?? null
  const renderMessage = useCallback(
    ({ item }: ListRenderItemInfo<Message>) =>
      item.role === "user" ? (
        <UserBubble message={item} />
      ) : (
        <AssistantBubble
          message={item}
          isLastAssistant={item.id === lastAssistantId}
          onCopy={handleCopy}
          onRegenerate={regenerateLastMessage}
        />
      ),
    [handleCopy, regenerateLastMessage, lastAssistantId],
  )

  // 포커스에 따라 컴포저 하단 패딩이 바뀐다(인셋↔8). 그대로 두면 키보드가
  // 뜨기 전에 먼저 툭 내려앉는 시프트가 보인다 — 키보드 타이밍에 맞춰 흘린다.
  const handleInputFocus = () => {
    if (keyboardHideRestoreTimerRef.current) {
      clearTimeout(keyboardHideRestoreTimerRef.current)
      keyboardHideRestoreTimerRef.current = null
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsInputFocused(true)
  }

  const handleInputBlur = () => {
    if (Platform.OS === "android") {
      return
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
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
    setPendingFoodConsultMessage(
      buildFoodConsultMessage(context, getAppLanguage(), (key, options) =>
        String(t(key as never, options as never)),
      ),
    )
  }, [
    foodConsultParams.foodConsultContext,
    foodConsultParams.foodConsultRequestId,
    resetChat,
    setCategory,
    t,
  ])

  useEffect(() => {
    if (pendingFoodConsultMessage && category === "FOOD_DIET") {
      sendMessage(pendingFoodConsultMessage)
      setPendingFoodConsultMessage(null)
    }
  }, [pendingFoodConsultMessage, category, sendMessage])

  /**
   * 건강검진 컨텍스트 주입.
   *
   * 식사 경로와 **같은 구조**다(빌더가 만든 텍스트가 곧 프롬프트이자 저장 원문, 화면에는
   * 파서가 복원한 카드). 분류는 항상 "EXAM" 이다 — 검사 수치 해석이 그 분류의 정의다.
   */
  const [pendingExamMessage, setPendingExamMessage] = useState<string | null>(
    null,
  )
  const handledExamRequestRef = useRef<string | null>(null)

  useEffect(() => {
    const rawContext = getParamString(foodConsultParams.examConsultContext)
    if (!rawContext) return

    const requestId =
      getParamString(foodConsultParams.examConsultRequestId) ?? rawContext
    if (handledExamRequestRef.current === requestId) return

    const context = parseExamConsultContext(rawContext)
    if (!context) return

    handledExamRequestRef.current = requestId
    resetChat()
    setInputMessage("")
    setCategory("EXAM")
    setPendingExamMessage(
      buildExamConsultMessage(context, getAppLanguage(), (key, options) =>
        String(t(key as never, options as never)),
      ),
    )
  }, [
    foodConsultParams.examConsultContext,
    foodConsultParams.examConsultRequestId,
    resetChat,
    setCategory,
    t,
  ])

  useEffect(() => {
    if (pendingExamMessage && category === "EXAM") {
      sendMessage(pendingExamMessage)
      setPendingExamMessage(null)
    }
  }, [pendingExamMessage, category, sendMessage])

  /**
   * 범용 프롬프트 주입 (`consultPrompt` + `consultCategory`).
   *
   * 위 식사 경로와 **같은 대기-후-전송 구조**를 쓴다: `setCategory` 는 다음 렌더에 반영되므로
   * 그 자리에서 바로 보내면 분류가 아직 이전 값이다. 그래서 문장을 pending 에 얹어 두고,
   * 분류가 목표 값이 된 뒤에 보낸다.
   *
   * 식사 경로와 상태를 공유하지 않는 이유: 한 화면에 둘 다 들어오는 일은 없지만, 공유하면
   * `category === "FOOD_DIET"` 조건 하나로 두 흐름을 구분할 수 없게 된다.
   */
  const [pendingPrompt, setPendingPrompt] = useState<{
    text: string
    category: ChatCategory
  } | null>(null)
  const handledPromptRequestRef = useRef<string | null>(null)

  useEffect(() => {
    const prompt = getParamString(foodConsultParams.consultPrompt)
    if (!prompt?.trim()) return

    // requestId 가 없으면 프롬프트 자체가 키가 된다 — 같은 질문을 다시 누르면 무시된다.
    // 호출부가 매번 다른 값을 주는 게 맞지만, 없다고 터뜨리지는 않는다.
    const requestId =
      getParamString(foodConsultParams.consultRequestId) ?? prompt
    if (handledPromptRequestRef.current === requestId) return
    handledPromptRequestRef.current = requestId

    const rawCategory = getParamString(foodConsultParams.consultCategory)
    const nextCategory: ChatCategory = CHAT_CATEGORIES.includes(
      rawCategory as ChatCategory,
    )
      ? (rawCategory as ChatCategory)
      : "NONE"

    resetChat()
    setInputMessage("")
    setCategory(nextCategory)
    setPendingPrompt({ text: prompt, category: nextCategory })
  }, [
    foodConsultParams.consultPrompt,
    foodConsultParams.consultCategory,
    foodConsultParams.consultRequestId,
    resetChat,
    setCategory,
  ])

  useEffect(() => {
    if (pendingPrompt && category === pendingPrompt.category) {
      sendMessage(pendingPrompt.text)
      setPendingPrompt(null)
    }
  }, [pendingPrompt, category, sendMessage])

  const handleSend = () => {
    if (!canSend) return
    sendMessage(inputMessage, attachedImageUri ?? undefined)
    setInputMessage("")
    setAttachedImageUri(null)
  }

  // Auto-scroll to bottom when new messages arrive or typing starts
  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true })
    }, 100)
    return () => clearTimeout(timer)
  }, [messages.length, isTyping])

  // 키보드 가시성 추적 — iOS 는 Will 이벤트가 애니메이션과 함께 와서 더 부드럽다.
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow"
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide"
    const show = Keyboard.addListener(showEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setIsKeyboardVisible(true)
    })
    const hide = Keyboard.addListener(hideEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setIsKeyboardVisible(false)
    })
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  useEffect(() => {
    if (Platform.OS !== "android") {
      return
    }

    const keyboardDidHide = Keyboard.addListener("keyboardDidHide", () => {
      keyboardHideRestoreTimerRef.current = setTimeout(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
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
        // iOS pageSheet는 이미 상태바 아래에 떠 있다 — inset을 더하면 이중 여백이 된다.
        paddingTop: Platform.OS === "ios" ? 8 : Math.max(insets.top, 12),
      }}
    >
      <FeatureIntroSheet
        feature="consult"
        visible={consultIntro.visible}
        onClose={consultIntro.dismiss}
      />
      <KeyboardAwareView keyboardVerticalOffset={0}>
        <ConsultChatHeader
          onHistoryPress={handleHistoryPress}
          onNewChatPress={handleNewChat}
          onClosePress={() => router.back()}
        />

        {isIdle ? (
          <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
            {/* 인사는 상단, 추천 질문은 컴포저 위에 도킹 — 빈 공간이 가운데로
                모여 숨 쉬는 여백이 되고, 질문 카드는 입력 동선 바로 곁에 선다. */}
            <YStack flex={1} paddingTop={20}>
              <YStack paddingHorizontal={20} gap={14}>
                <ExpoImage
                  source={require("@/assets/images/home-record-character.png")}
                  style={{ width: 64, height: 64 }}
                  contentFit="contain"
                />
                <YStack gap={6}>
                  <Text
                    fontSize={23}
                    lineHeight={32}
                    fontWeight="700"
                    letterSpacing={-0.4}
                    color={
                      isDarkMode
                        ? tokens.color.textDark.val
                        : tokens.color.textLight.val
                    }
                  >
                    {t("consult.heroTitle")}
                  </Text>
                  <Text
                    fontSize={15}
                    lineHeight={22}
                    color={
                      isDarkMode
                        ? tokens.color.textDarkSub.val
                        : tokens.color.textLightSub.val
                    }
                    lineBreakStrategyIOS="hangul-word"
                    textBreakStrategy="balanced"
                  >
                    {t("consult.heroBody")}
                  </Text>
                </YStack>
              </YStack>

              <View style={{ flex: 1 }} />

              {!isInputFocused && (
                <Animated.View
                  entering={FadeIn.duration(300)}
                  exiting={FadeOut.duration(200)}
                >
                  <YStack gap={10}>
                    <Text
                      paddingHorizontal={20}
                      fontSize={13.5}
                      lineHeight={19}
                      fontWeight="600"
                      color={
                        isDarkMode
                          ? tokens.color.textDarkSub.val
                          : tokens.color.textLightSub.val
                      }
                    >
                      {t("consult.popularQuestions")}
                    </Text>
                    <FaqCarousel onFaqPress={handleFaqPress} />
                  </YStack>
                </Animated.View>
              )}

              {/* 면책·출처는 조용한 한 블록 — 회색 위계만으로 말한다.
                  포인트 컬러·이모지를 얹으면 CTA 로 오독되고 시스템 밖으로 튄다. */}
              <YStack
                alignItems="center"
                gap={6}
                paddingHorizontal={24}
                paddingTop={16}
              >
                <Text
                  fontSize={11.5}
                  letterSpacing={-0.2}
                  color={
                    isDarkMode
                      ? tokens.color.textLightMuted.val
                      : tokens.color.textLightSub.val
                  }
                  textAlign="center"
                  lineHeight={17}
                  lineBreakStrategyIOS="hangul-word"
                  textBreakStrategy="balanced"
                >
                  {t("consult.disclaimer")}
                </Text>
                <Pressable
                  onPress={() => router.push("/(settings)/medical-reference")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("consult.references")}
                >
                  {({ pressed }) => (
                    <Text
                      fontSize={12}
                      lineHeight={17}
                      letterSpacing={-0.24}
                      fontWeight="600"
                      color={
                        isDarkMode ? tokens.color.textDarkSub.val : "#4E5056"
                      }
                      opacity={pressed ? 0.5 : 1}
                    >
                      {t("consult.references")}
                    </Text>
                  )}
                </Pressable>
              </YStack>
            </YStack>
          </Pressable>
        ) : (
          <FlatList
            bounces={false}
            overScrollMode="never"
            ref={listRef}
            style={{ flex: 1 }}
            data={messages}
            keyExtractor={keyExtractor}
            renderItem={renderMessage}
            ItemSeparatorComponent={MessageSeparator}
            // 상태말도 하나의 턴이다 — 마지막 메시지와 턴 간격(24)만큼 띄운다.
            ListFooterComponent={
              isTyping ? (
                <View style={{ paddingTop: 24 }}>
                  <TypingIndicator />
                </View>
              ) : null
            }
            contentContainerStyle={{ paddingVertical: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            // 스트리밍으로 본문이 자랄 때, 사용자가 바닥 근처에 있을 때만 따라간다.
            // 위로 올려 읽는 중이면 붙잡지 않는다.
            onScroll={(event) => {
              const { contentOffset, contentSize, layoutMeasurement } =
                event.nativeEvent
              isNearBottomRef.current =
                contentSize.height -
                  contentOffset.y -
                  layoutMeasurement.height <
                120
            }}
            scrollEventThrottle={32}
            onContentSizeChange={(_, height) => {
              // scrollToEnd 는 내부 측정치가 한 박자 늦어 끝에 못 미친다 —
              // 콜백이 주는 최종 높이로 직접 간다(범위 밖 오프셋은 클램프됨).
              if (isNearBottomRef.current) {
                listRef.current?.scrollToOffset({
                  offset: Math.max(0, height),
                  animated: false,
                })
              }
            }}
            // 말풍선은 높이가 제각각이라 getItemLayout 을 줄 수 없습니다.
            // 화면에 보이는 만큼만 유지하도록 창을 좁게 잡습니다.
            initialNumToRender={12}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews
          />
        )}

        {/* Bottom Composer — 키보드가 없을 땐 홈 인디케이터·안드로이드
            내비바 만큼 바닥을 비운다. 실제 키보드가 올라올 때만 인셋을 걷는다. */}
        <YStack
          backgroundColor="transparent"
          paddingTop={8}
          paddingBottom={isKeyboardVisible ? 8 : Math.max(insets.bottom, 12)}
          paddingHorizontal={20}
        >
          {isIdle && isInputFocused && (
            <>
              <Text fontSize={12} color="#81818d" lineHeight={16}>
                {t("consult.category")}
              </Text>
              <ScrollView
                bounces={false}
                overScrollMode="never"
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 8, gap: 8 }}
                keyboardShouldPersistTaps="always"
              >
                {CATEGORY_LIST.map((cat) => (
                  <Chip
                    key={cat.key}
                    icon={cat.icon}
                    label={t(`consult.categories.${cat.key}`)}
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
            {/* 전송 전 첨부 미리보기 — 인풋 위에 얹히고 X로 뺄 수 있다. */}
            {attachedImageUri && (
              <View style={styles.attachmentRow}>
                <View style={styles.attachmentThumbWrap}>
                  <ExpoImage
                    source={{ uri: attachedImageUri }}
                    style={styles.attachmentThumb}
                    contentFit="cover"
                    transition={100}
                  />
                  <Pressable
                    onPress={clearAttachedImage}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t("consult.removeAttachment")}
                    style={styles.attachmentRemove}
                  >
                    <Icon name="x" size={12} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            )}
            <View style={styles.inputRow}>
              <Pressable
                onPress={handlePlusPress}
                disabled={isTyping}
                accessibilityRole="button"
                accessibilityLabel={t("consult.openAttachmentMenu")}
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
                placeholder={t("consult.placeholder")}
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
          </View>
        </YStack>
      </KeyboardAwareView>

      {/* 복사 토스트 — 레이아웃 밖 플로팅. 화면을 밀지 않는다. */}
      {showToast && (
        <View
          pointerEvents="none"
          style={[
            styles.toastOverlay,
            { bottom: Math.max(insets.bottom, 12) + 84 },
          ]}
        >
          <CopyToast message={t("consult.copied")} />
        </View>
      )}
      {/* Chat History Sheet */}
      <ChatHistorySheet.Layout
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      >
        <ChatHistorySheet.Header onClose={() => setHistoryOpen(false)} />
        <ChatHistorySheet.Content
          chats={chatHistoryList}
          isLoading={isFetching}
          onNewChat={handleNewChat}
          onSelect={handleSelectHistory}
          onRename={handleRenamePress}
          onDelete={handleDeletePress}
        />
        <RenameModal
          visible={renameTarget !== null}
          currentName={renameTarget?.title ?? ""}
          onConfirm={handleRenameConfirm}
          onCancel={() => setRenameTarget(null)}
        />
      </ChatHistorySheet.Layout>
      {/* Attach Menu — iOS pageSheet 위에선 RN Modal 이 프레젠트되지 않는다
          (이미 presented 된 VC 위 중첩 프레젠트 실패). 화면 내 오버레이로 띄운다. */}
      {attachMenuOpen && (
        <Pressable
          style={[StyleSheet.absoluteFill, attachStyles.backdrop]}
          onPress={() => setAttachMenuOpen(false)}
        >
          <Animated.View
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(120)}
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
                {t("consult.choosePhoto")}
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
                {t("consult.takePhoto")}
              </Text>
              <Icon name="paperclip" size={20} color={menuTextColor} />
            </Pressable>
          </Animated.View>
        </Pressable>
      )}
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
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  attachmentRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  attachmentThumbWrap: {
    width: 64,
    height: 64,
  },
  attachmentThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  attachmentRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(23,24,28,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  toastOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
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
