import { FeatureIntroSheet, useFeatureIntro } from "@/src/features/coach"
import { useCallback, useRef, useEffect, useState } from "react"
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller"
import {
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
import { remoteImageSource } from "@/src/shared/images/remoteImageSource"
import * as ImagePicker from "expo-image-picker"
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import type { Chat, ChatCategory, Message } from "@/src/types/chat"
import {
  CHAT_CATEGORIES,
  MAX_CHAT_MESSAGE_CONTENT_LENGTH,
} from "@/src/types/chat"
import type { FaqCardEntry } from "@/src/features/consultation/types"

import { CATEGORY_LIST } from "@/src/features/consultation/data/mockData"
import { useChat } from "@/src/features/consultation/hooks/useChat"

import { V2Text, V2VStack } from "@/src/design-system-v2"
import { Chip } from "@/src/shared/components/Chip"
import { Icon } from "@/src/shared/components/Icon"
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

import { showConfirm } from "@/src/lib/dialog"
import { presentError } from "@/src/lib/errorMessage"

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
  const [historyOpen, setHistoryOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<Chat | null>(null)
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [attachMenuPosition, setAttachMenuPosition] = useState({
    bottom: 0,
    left: 0,
  })
  /** 전송 전 인풋에 얹어 둔 첨부 사진. X로 취소할 수 있다. */
  const [attachedImageUri, setAttachedImageUri] = useState<string | null>(null)

  const listRef = useRef<FlatList<Message>>(null)
  // 스트리밍 자동 추적용 — 바닥에서 120pt 안에 있을 때만 따라간다.
  const isNearBottomRef = useRef(true)
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

  /**
   * ## 이 화면에서 키보드를 피하는 방법은 **한 겹뿐**이다
   *
   * 예전엔 세 겹이 겹쳐 있었다: 화면 전체를 감싼 `KeyboardAvoidingView`(behavior
   * "padding")가 컴포저를 키보드 높이만큼 밀어 올리고, 그 안의 `KeyboardStickyView`
   * 가 입력창만 **한 번 더** 같은 높이로 들어 올렸다. 두 번 더해진 결과가 2026-08-03
   * QA 스크린샷의 "입력창이 화면 최상단으로 날아감" 이다. 거기에 컴포저 하단 여백
   * (인셋↔8)과 추천 질문 카드 페이드아웃, 카테고리 줄 페이드인이 각각 별도의
   * `LayoutAnimation` 으로 동시에 달리면서, 한 번의 탭에 서로 다른 곡선의 애니메이션
   * 네 개가 경주했다. 사용자가 다음 프레임을 예측할 방법이 없었다.
   *
   * 지금은 **본문 열의 바닥 여백 하나**만 움직인다.
   *
   * - 값은 키보드가 실제로 그리는 곡선(`useReanimatedKeyboardAnimation`)에서 직접 온다 —
   *   JS 타이머·`LayoutAnimation` 추정이 아니라서 키보드와 어긋날 수가 없다.
   * - 여백이 자라면 그 위의 목록/빈 화면이 같이 줄어든다. 그래서 마지막 답변이
   *   키보드 뒤로 숨지 않는다(컴포저만 띄우는 방식의 고질병).
   * - 안전영역도 같은 식 하나가 맡는다: 키보드가 없을 땐 홈 인디케이터만큼 비우고,
   *   키보드가 올라오면 키보드가 이미 그 영역을 덮으므로 8pt 만 남긴다. 두 값이
   *   `Math.max` 로 한 줄에 있으니 따로 튀는 시프트가 생기지 않는다.
   *
   * 되돌리지 말 것: 여기에 `KeyboardAvoidingView`·`KeyboardStickyView` 를 다시 얹으면
   * 그 순간 보정이 두 겹이 된다.
   */
  const { height: keyboardOffset } = useReanimatedKeyboardAnimation()
  const restBottomInset = Math.max(insets.bottom, 12)
  const bodyStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(restBottomInset, -keyboardOffset.value + 8),
  }))
  // 토스트는 레이아웃 밖(절대배치)이라 위 여백을 못 받는다 — 같은 값으로 직접 태운다.
  const toastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: keyboardOffset.value }],
  }))

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

  /**
   * 대상 id 를 인자로 받는다 — 모달을 닫으면 `renameTarget` 이 비어서, 상태를 읽는
   * 재시도 버튼은 눌러도 아무 일도 하지 않는 버튼이 된다.
   */
  const renameChat = async (chatId: number, newName: string) => {
    try {
      await chatApiService.renameChat(chatId, newName)
      queryClient.invalidateQueries({ queryKey: ["chat", "history"] })
    } catch (error) {
      // 예전에는 콘솔에만 남겼다 — 제목이 그대로인 이유를 화면 어디서도 말하지 않았다.
      presentError(error, {
        scope: "consult-rename",
        retry: () => void renameChat(chatId, newName),
        refresh: () =>
          queryClient.invalidateQueries({ queryKey: ["chat", "history"] }),
      })
    }
  }

  const handleRenameConfirm = async (newName: string) => {
    if (!renameTarget) return
    const chatId = renameTarget.id
    setRenameTarget(null)
    await renameChat(chatId, newName)
  }

  const handleDeletePress = async (item: Chat) => {
    const confirmed = await showConfirm({
      title: t("consult.deleteTitle"),
      description: t("consult.deleteBody"),
      confirmLabel: t("action.delete"),
      cancelLabel: t("action.cancel"),
      destructive: true,
    })
    if (!confirmed) return
    await deleteChat(item)
  }

  const deleteChat = async (item: Chat) => {
    try {
      await chatApiService.deleteChat(item.id)
      queryClient.invalidateQueries({ queryKey: ["chat", "history"] })
      if (item.id === conversationId) {
        resetChat()
      }
    } catch (error) {
      /*
        재시도는 확인 다이얼로그를 건너뛴다 — 사용자는 방금 "삭제" 를 눌렀고, 지우겠다는
        뜻은 이미 확인됐다. 여기서 또 물으면 같은 질문을 두 번 하는 셈이다.
        이미 지워진 상담(`COMMON_ERROR_004` 계열)이면 목록을 새로 받는 것이 해결이다.
      */
      presentError(error, {
        scope: "consult-delete",
        retry: () => void deleteChat(item),
        refresh: () =>
          queryClient.invalidateQueries({ queryKey: ["chat", "history"] }),
      })
    }
  }

  // 메뉴는 누른 지점 바로 위에 선다. 좌표는 화면 기준이라 키보드가 오르내리면
  // 어긋나므로, 키보드가 움직이는 순간 메뉴를 닫는다(아래 키보드 효과).
  const handlePlusPress = (e: GestureResponderEvent) => {
    const { pageY } = e.nativeEvent
    const screenHeight = Dimensions.get("window").height
    setAttachMenuPosition({ bottom: screenHeight - pageY + 8, left: 20 })
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
      const confirmed = await showConfirm({
        title: t("consult.photoPermissionTitle"),
        description: t("consult.photoPermissionBody"),
        confirmLabel: t("consult.openSettings"),
        cancelLabel: t("action.cancel"),
      })
      if (confirmed) void Linking.openSettings()
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
      const confirmed = await showConfirm({
        title: t("consult.cameraPermissionTitle"),
        description: t("consult.cameraPermissionBody"),
        confirmLabel: t("consult.openSettings"),
        cancelLabel: t("action.cancel"),
      })
      if (confirmed) void Linking.openSettings()
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

  /**
   * 키보드가 움직일 때 화면이 해야 할 일은 두 가지뿐이다.
   *
   * 1. **컴포저 바로 위에 있던 것이 계속 컴포저 바로 위에 있게 한다.** 본문 열이
   *    키보드만큼 줄어들어도 스크롤 오프셋은 그대로라, 그냥 두면 마지막 답변의 끝이
   *    접힌 만큼 컴포저 뒤로 밀려난다.
   *
   *    `Will`(iOS)과 `Did` 를 **둘 다** 듣는다. 답이 길어 이미 넘치고 있으면 Will 시점의
   *    스크롤이 키보드와 같이 움직여 부드럽고, 답이 화면에 딱 맞던 경우엔 Will 시점엔
   *    아직 넘칠 게 없어 아무 일도 안 일어난다 — 줄어든 **뒤**인 Did 에서야 끝으로 간다.
   *    하나만 듣던 판이 실제로 그 두 경우 중 하나를 놓쳤다(2026-08-03 실측).
   *
   * 2. 화면 좌표에 고정해 둔 첨부 메뉴를 닫는다 — 컴포저는 올라가는데 메뉴만
   *    제자리에 남으면 어디에 붙은 메뉴인지 알 수 없게 된다.
   *
   * 여백 자체는 여기서 건드리지 않는다(위 `bodyStyle`). 이 리스너는 레이아웃을
   * 만들지 않으므로 애니메이션 경주가 생기지 않는다.
   */
  useEffect(() => {
    // 위로 올려 읽는 중이면 붙잡지 않는다 — 바닥 근처였던 사람만 따라간다.
    const keepPinnedToBottom = () => {
      if (isNearBottomRef.current) {
        listRef.current?.scrollToEnd({ animated: true })
      }
    }
    const onShow = () => {
      setAttachMenuOpen(false)
      keepPinnedToBottom()
    }
    // Will* 은 안드로이드에서 아예 발화하지 않는다 — 거기선 Did 하나로 족하다.
    const listeners = [
      Platform.OS === "ios"
        ? Keyboard.addListener("keyboardWillShow", onShow)
        : null,
      Keyboard.addListener("keyboardDidShow", onShow),
      Keyboard.addListener(
        Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
        () => setAttachMenuOpen(false),
      ),
    ]
    return () => listeners.forEach((listener) => listener?.remove())
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
      <ConsultChatHeader
        onHistoryPress={handleHistoryPress}
        onNewChatPress={handleNewChat}
        onClosePress={() => router.back()}
      />

      {/* 헤더 아래 전부가 한 덩어리다. 키보드가 오르내리면 이 열의 바닥 여백만
          자라고 줄어든다 — 화면에서 움직이는 것은 이것 하나뿐이다(bodyStyle 머리말). */}
      <Animated.View style={[{ flex: 1 }, bodyStyle]}>
        {isIdle ? (
          /*
            빈 화면은 **스크롤 한 장**이다. 예전엔 고정 열이라, 키보드가 올라와 자리가
            없어지면 추천 질문 카드를 통째로 페이드아웃시켜 자리를 만들었다 — 입력하려고
            탭했을 뿐인데 방금 읽던 카드가 사라지고, 그 자리에 카테고리 줄이 새로 나타났다.
            스크롤이면 무엇도 사라지지 않는다. 자리가 줄면 줄어든 만큼 스크롤이 생길 뿐이다.

            `flexGrow:1` + 가운데 스페이서: 자리가 남을 때는 지금까지처럼 인사가 위,
            추천 질문·면책이 컴포저 곁에 도킹된다. 자리가 모자라면 스페이서가 먼저
            줄어들고(minHeight 24), 그 다음에야 스크롤이 된다.
          */
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingTop: 20 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            // 빈 곳을 탭하면 키보드가 내려간다(예전 Pressable 감싸기를 대신한다).
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <V2VStack paddingHorizontal={20} gap={14}>
              <ExpoImage
                source={require("@/assets/images/home-record-character.png")}
                style={{ width: 64, height: 64 }}
                contentFit="contain"
              />
              <V2VStack gap={6}>
                <V2Text
                  color={
                    isDarkMode
                      ? tokens.color.textDark.val
                      : tokens.color.textLight.val
                  }
                  lineBreakStrategyIOS="hangul-word"
                  style={{
                    fontSize: 23,
                    lineHeight: 32,
                    fontWeight: "700",
                    letterSpacing: -0.4,
                  }}
                >
                  {t("consult.heroTitle")}
                </V2Text>
                <V2Text
                  color={
                    isDarkMode
                      ? tokens.color.textDarkSub.val
                      : tokens.color.textLightSub.val
                  }
                  lineBreakStrategyIOS="hangul-word"
                  textBreakStrategy="balanced"
                  style={{ fontSize: 15, lineHeight: 22 }}
                >
                  {t("consult.heroBody")}
                </V2Text>
              </V2VStack>
            </V2VStack>

            {/*
              자리가 남으면 여백이 되고, 모자라면 24pt 만 남기고 스크롤에 넘긴다.
              `flex:1` 로 쓰면 안 된다 — flexBasis 가 0 이 되어 콘텐츠 높이가 뷰포트로
              고정되고, 넘치는 만큼이 스크롤이 아니라 **잘림**이 된다(키보드를 올리면
              추천 질문 카드 아랫부분과 면책 문구에 아예 닿을 수 없었다).
            */}
            <View style={{ flexGrow: 1, flexShrink: 0, flexBasis: 24 }} />

            <V2VStack gap={10}>
              <V2Text
                color={
                  isDarkMode
                    ? tokens.color.textDarkSub.val
                    : tokens.color.textLightSub.val
                }
                lineBreakStrategyIOS="hangul-word"
                style={{
                  paddingHorizontal: 20,
                  fontSize: 13.5,
                  lineHeight: 19,
                  fontWeight: "600",
                }}
              >
                {t("consult.popularQuestions")}
              </V2Text>
              <FaqCarousel onFaqPress={handleFaqPress} />
            </V2VStack>

            {/* 면책·출처는 조용한 한 블록 — 회색 위계만으로 말한다.
                포인트 컬러·이모지를 얹으면 CTA 로 오독되고 시스템 밖으로 튄다. */}
            <V2VStack
              align="center"
              gap={6}
              paddingHorizontal={24}
              style={{ paddingTop: 16 }}
            >
              <V2Text
                color={
                  isDarkMode
                    ? tokens.color.textLightMuted.val
                    : tokens.color.textLightSub.val
                }
                lineBreakStrategyIOS="hangul-word"
                textBreakStrategy="balanced"
                style={{
                  fontSize: 11.5,
                  letterSpacing: -0.2,
                  textAlign: "center",
                  lineHeight: 17,
                }}
              >
                {t("consult.disclaimer")}
              </V2Text>
              <Pressable
                onPress={() => router.push("/(settings)/medical-reference")}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("consult.references")}
              >
                {({ pressed }) => (
                  <V2Text
                    color={
                      isDarkMode ? tokens.color.textDarkSub.val : "#4E5056"
                    }
                    lineBreakStrategyIOS="hangul-word"
                    style={{
                      fontSize: 12,
                      lineHeight: 17,
                      letterSpacing: -0.24,
                      fontWeight: "600",
                      opacity: pressed ? 0.5 : 1,
                    }}
                  >
                    {t("consult.references")}
                  </V2Text>
                )}
              </Pressable>
            </V2VStack>
          </ScrollView>
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

        {/*
          컴포저는 이 화면에서 **자리도 크기도 변하지 않는 유일한 물건**이다.
          바닥 여백은 위 Animated.View 가 혼자 맡는다 — 여기서 다시 인셋을 주면
          그 순간 보정이 두 겹이 된다.
        */}
        <V2VStack
          paddingHorizontal={20}
          gap={8}
          style={{ backgroundColor: "transparent", paddingTop: 8 }}
        >
          {/*
            주제 칩은 **빈 화면이면 늘 보인다**. 예전엔 인풋 포커스에만 나타나서,
            탭 한 번에 없던 줄이 생기고 추천 질문이 사라졌다 — 화면이 스스로 재배치되는
            것처럼 보인 원인 중 하나다. 대화가 시작되면 사라지는데, 그건 분류가
            대화 생성 시점에 확정되기 때문이고(useChat.createChat) 사용자가 직접
            만든 전환이라 납득된다.
          */}
          {isIdle && (
            <V2VStack gap={8}>
              <V2Text
                color="#81818d"
                lineBreakStrategyIOS="hangul-word"
                style={{ fontSize: 12, lineHeight: 16 }}
              >
                {t("consult.category")}
              </V2Text>
              <ScrollView
                bounces={false}
                overScrollMode="never"
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
                keyboardShouldPersistTaps="always"
              >
                {CATEGORY_LIST.map((cat) => (
                  <Chip
                    key={cat.key}
                    icon={cat.icon}
                    label={t(`consult.categories.${cat.key}`)}
                    // 고른 칩을 다시 누르면 풀린다 — 되돌릴 수 없는 선택을 만들지 않는다.
                    onPress={() =>
                      setCategory(cat.key === category ? null : cat.key)
                    }
                    isSelected={cat.key === category}
                  />
                ))}
              </ScrollView>
            </V2VStack>
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
                    source={remoteImageSource(attachedImageUri)}
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
                accessibilityRole="button"
                accessibilityLabel={t("consult.openAttachmentMenu")}
                style={({ pressed }) => ({
                  ...styles.attachButton,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Icon name="paperclip" size={20} color={menuTextColor} />
              </Pressable>

              {/*
                  답변이 흘러나오는 동안에도 계속 쓸 수 있다. 예전엔 `editable={false}`
                  라 키보드는 그대로 떠 있는데 글자만 안 찍혔다 — 고장으로 읽힌다.
                  막아야 할 것은 입력이 아니라 전송이고, 그건 아래 버튼이 이미 한다.
                */}
              <TextInput
                value={inputMessage}
                onChangeText={setInputMessage}
                placeholder={t("consult.placeholder")}
                placeholderTextColor={isDarkMode ? "#66666B" : "#81818D"}
                multiline
                maxLength={MAX_CHAT_MESSAGE_CONTENT_LENGTH}
                style={{
                  ...styles.input,
                  color: isDarkMode
                    ? tokens.color.textDark.val
                    : tokens.color.textLight.val,
                }}
              />

              <Pressable
                onPress={handleSend}
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSend }}
                accessibilityLabel={t("consult.send")}
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
        </V2VStack>
      </Animated.View>

      {/* 복사 토스트 — 레이아웃 밖 플로팅. 화면을 밀지 않는다.
          절대배치라 본문 여백을 못 받으므로 키보드 값을 직접 태운다. */}
      {showToast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toastOverlay,
            { bottom: restBottomInset + 84 },
            toastStyle,
          ]}
        >
          <CopyToast message={t("consult.copied")} />
        </Animated.View>
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
              <V2Text
                lineBreakStrategyIOS="hangul-word"
                style={[attachStyles.menuItemText, { color: menuTextColor }]}
              >
                {t("consult.choosePhoto")}
              </V2Text>
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
              <V2Text
                lineBreakStrategyIOS="hangul-word"
                style={[attachStyles.menuItemText, { color: menuTextColor }]}
              >
                {t("consult.takePhoto")}
              </V2Text>
              <Icon name="paperclip" size={20} color={menuTextColor} />
            </Pressable>
          </Animated.View>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  /*
    iOS 의 여러 줄 TextInput 은 `lineHeight` 를 주면 **플레이스홀더만 아래로 내려간다** —
    입력 글자는 줄 높이 안에서 가운데 앉는데 플레이스홀더 라벨은 그 보정을 받지 못해
    행의 아이콘·입력 글자보다 낮게 그려진다(2026-09-02 신고, 시뮬레이터에서도 보인다).
    iOS 는 줄 높이를 시스템 기본(≈19)에 맡기고 세로 여백으로 높이를 맞춘다. 안드로이드는
    이 결함이 없고 `lineHeight` 가 없으면 한글 자간이 답답해져 그대로 둔다.
  */
  input: {
    flex: 1,
    fontSize: 16,
    includeFontPadding: false,
    minHeight: 32,
    maxHeight: 120,
    ...Platform.select({
      ios: { paddingTop: 6, paddingBottom: 6 },
      default: { lineHeight: 22, paddingVertical: 5, textAlignVertical: "center" as const },
    }),
    padding: 0,
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
