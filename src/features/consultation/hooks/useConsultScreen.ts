import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { useFeatureIntro } from "@/src/features/coach"
import { useRef, useEffect, useState } from "react"
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller"
import { useGlobalKeyboardToolbarVisible } from "@/src/stores/keyboardToolbarStore"
import { FlatList, Platform, Keyboard } from "react-native"
import { useAppRouter } from "@/src/shared/navigation"
import { useAnimatedStyle, useReducedMotion } from "react-native-reanimated"
import { useConsultExitGuard } from "./useConsultExitGuard"
import { useConsultAttachments } from "./useConsultAttachments"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { Chat, ChatCategory, Message } from "@/src/types/chat"
import { CHAT_CATEGORIES } from "@/src/types/chat"
import type { FaqCardEntry } from "../types"
import { useChat } from "./useChat"
import { useCopyToClipboard } from "./useCopyToClipboard"
import {
  buildFoodConsultMessage,
  parseFoodConsultContext,
} from "../utils/foodConsultMessage"
import {
  buildExamConsultMessage,
  parseExamConsultContext,
} from "../utils/examConsultMessage"
import { chatApiService } from "@/src/services"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { chatHistoryQuery } from "../data/queyOptions"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"

import { useTranslation } from "react-i18next"
import { getAppLanguage } from "@/src/i18n"
import { showConfirm } from "@/src/lib/dialog"
import { presentError } from "@/src/lib/errorMessage"
/**
 * 전역 키보드 툴바의 높이. 라이브러리 상수
 * `react-native-keyboard-controller/src/components/KeyboardToolbar/constants.ts`
 * (`KEYBOARD_TOOLBAR_HEIGHT = 42`)의 거울이다 — 패키지 index 가 내보내지 않아 여기 적는다.
 * `scripts/check-fb-chat-layout.mjs` 가 두 값이 같은지 잰다.
 */
const KEYBOARD_TOOLBAR_HEIGHT = 42
export type ConsultRouteParams = {
  consultContext?: string | string[]
  consultContextLabel?: string | string[]
  consultRestaurantId?: string | string[]
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

export function useConsultScreen(foodConsultParams: ConsultRouteParams) {
  // 첫 진입 안내 — 무엇을 물을 수 있는지와 진료 한계를 먼저 말한다.
  const consultIntro = useFeatureIntro("consult")
  const { t, i18n } = useTranslation("common")
  const language = (i18n.resolvedLanguage ?? i18n.language).startsWith("en")
    ? "en"
    : "ko"
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const colorScheme = useAppColorScheme()
  const isDarkMode = colorScheme === "dark"
  const [inputMessage, setInputMessage] = useState("")
  const [historyOpen, setHistoryOpen] = useState(false)
  const [contextDismissed, setContextDismissed] = useState(false)
  const activeContext = contextDismissed
    ? null
    : getParamString(foodConsultParams.consultContext)
  const contextLabel = activeContext
    ? getParamString(foodConsultParams.consultContextLabel)
    : null
  const [renameTarget, setRenameTarget] = useState<Chat | null>(null)
  const listRef = useRef<FlatList<Message>>(null)
  const inputRef = useRef<TextInput>(null)
  const attachments = useConsultAttachments({
    topInset: insets.top,
    restoreFocus: () => inputRef.current?.focus(),
  })
  const { attachedImageUri, clearAttachedImage, closeAttachMenu } = attachments
  const focusDraftAfterHistory = useRef(false)
  useEffect(() => {
    if (historyOpen || !focusDraftAfterHistory.current) return
    focusDraftAfterHistory.current = false
    // Let the editor become accessible again before asking iOS to focus it.
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [historyOpen])
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
    stopGenerating,
    isLoadingConversation,
  } = useChat({ recipeCards: true, dataCards: true })
  const reduceMotion = useReducedMotion()
  const confirmTransition = useConsultExitGuard({
    hasDraft: !!inputMessage.trim() || !!attachedImageUri,
    isSending,
    stopGenerating,
    dismissOverlay: renameTarget
      ? () => setRenameTarget(null)
      : attachments.attachMenuOpen
        ? closeAttachMenu
        : historyOpen
          ? () => setHistoryOpen(false)
          : undefined,
    restoreDraftFocus: () => {
      if (historyOpen) {
        focusDraftAfterHistory.current = true
        setHistoryOpen(false)
      } else inputRef.current?.focus()
    },
  })
  const queryClient = useQueryClient()

  const {
    data: chats,
    isFetching,
    error: historyError,
    refetch: refetchHistory,
  } = useQuery(chatHistoryQuery(historyOpen, language))

  const chatHistoryList: Chat[] = chats?.conversations ?? []

  const canSend =
    (!!inputMessage.trim() || !!attachedImageUri) &&
    !attachments.isPickingPhoto &&
    !isTyping &&
    !isSending &&
    !isLoadingConversation

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
  const { height: keyboardOffset, progress: keyboardProgress } =
    useReanimatedKeyboardAnimation()
  const restBottomInset = Math.max(insets.bottom, 12)
  /*
    키보드 위에는 전역 "완료" 툴바(`AppKeyboardSurface`)가 한 겹 더 앉는다.
    `useReanimatedKeyboardAnimation().height` 는 **키보드만** 재므로, 그 값만큼만
    비우면 툴바(42pt)가 컴포저 하단을 덮는다 — 2026-09-11 피드백 "입력창과 그
    윗줄이 완료 바에 가려요" 의 정체. 툴바가 그려질 때만 그 높이를 키보드 곡선
    (`progress`)에 태워 같이 비운다. 툴바를 끄지 않는 이유: 이 화면은 자기 키보드
    내리기 버튼이 없어서 완료 바가 유일한 보장된 탈출구다(keyboardToolbarStore 머리말).
  */
  const accessoryHeight = useGlobalKeyboardToolbarVisible()
    ? KEYBOARD_TOOLBAR_HEIGHT
    : 0
  const bodyStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(
      restBottomInset,
      -keyboardOffset.value + keyboardProgress.value * accessoryHeight + 8,
    ),
  }))
  // 토스트는 레이아웃 밖(절대배치)이라 위 여백을 못 받는다 — 같은 값으로 직접 태운다.
  const toastStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          keyboardOffset.value - keyboardProgress.value * accessoryHeight,
      },
    ],
  }))

  const handleHistoryPress = () => {
    closeAttachMenu()
    Keyboard.dismiss()
    setHistoryOpen(true)
  }
  const handleNewChat = () =>
    void confirmTransition(() => {
      setContextDismissed(true)
      setHistoryOpen(false)
      setInputMessage("")
      clearAttachedImage()
      isNearBottomRef.current = true
      resetChat()
    })
  const handleSelectHistory = async (id: number) => {
    if (id === conversationId) {
      setHistoryOpen(false)
      return
    }
    await confirmTransition(async () => {
      isNearBottomRef.current = true
      const loaded = await loadConversation(id)
      if (loaded) {
        setContextDismissed(true)
        setHistoryOpen(false)
        setInputMessage("")
        clearAttachedImage()
      }
    })
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

  const { handleCopy, showToast } = useCopyToClipboard()

  const [pendingFoodConsultMessage, setPendingFoodConsultMessage] = useState<
    string | null
  >(null)
  const handledFoodConsultRequestRef = useRef<string | null>(null)

  const handleFaqPress = (entry: FaqCardEntry) => {
    if (entry.description === inputMessage) {
      inputRef.current?.focus()
      return
    }
    void confirmTransition(() => {
      setCategory(entry.category)
      setInputMessage(entry.description)
      inputRef.current?.focus()
    })
  }

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
    clearAttachedImage()
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
    clearAttachedImage,
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
    clearAttachedImage()
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
    clearAttachedImage,
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

  // Context-only entries open a fresh, editable conversation. Never append a
  // newly selected report to an unrelated existing thread or send automatically.
  const handledContextRequestRef = useRef<string | null>(null)
  useEffect(() => {
    const context = getParamString(foodConsultParams.consultContext)
    const requestId = getParamString(foodConsultParams.consultRequestId)
    if (
      !context ||
      !requestId ||
      getParamString(foodConsultParams.consultPrompt)
    )
      return
    if (handledContextRequestRef.current === requestId) return
    handledContextRequestRef.current = requestId
    resetChat()
    clearAttachedImage()
    setInputMessage("")
    setContextDismissed(false)
    setCategory("FOOD_DIET")
  }, [
    foodConsultParams.consultContext,
    foodConsultParams.consultRequestId,
    foodConsultParams.consultPrompt,
    resetChat,
    clearAttachedImage,
    setCategory,
  ])

  useEffect(() => {
    if (activeContext && messages.length === 0) setCategory("FOOD_DIET")
  }, [activeContext, messages.length, setCategory])

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
    clearAttachedImage()
    setInputMessage("")
    setCategory(nextCategory)
    setPendingPrompt({ text: prompt, category: nextCategory })
  }, [
    foodConsultParams.consultPrompt,
    foodConsultParams.consultCategory,
    foodConsultParams.consultRequestId,
    resetChat,
    clearAttachedImage,
    setCategory,
  ])

  useEffect(() => {
    if (pendingPrompt && category === pendingPrompt.category) {
      sendMessage(pendingPrompt.text)
      const id = Number(getParamString(foodConsultParams.consultRestaurantId))
      if (Number.isSafeInteger(id) && id > 0)
        trackAnalyticsEvent("restaurant_ai_consult_send", {
          restaurant_id: id,
          turn: 1,
        })
      setPendingPrompt(null)
    }
  }, [
    pendingPrompt,
    category,
    sendMessage,
    foodConsultParams.consultRestaurantId,
  ])

  function trackRestaurantTurn() {
    const id = Number(getParamString(foodConsultParams.consultRestaurantId))
    if (!contextDismissed && Number.isSafeInteger(id) && id > 0) {
      trackAnalyticsEvent("restaurant_ai_consult_send", {
        restaurant_id: id,
        turn: messages.filter((message) => message.role === "user").length + 1,
      })
    }
  }

  const handleSend = () => {
    if (!canSend) return
    Keyboard.dismiss()
    isNearBottomRef.current = true
    const text =
      activeContext && messages.length === 0
        ? `${inputMessage.trim()}\n\n${activeContext}`
        : inputMessage
    sendMessage(text, attachedImageUri ?? undefined)
    trackRestaurantTurn()
    setInputMessage("")
    clearAttachedImage()
  }

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
        listRef.current?.scrollToEnd({ animated: !reduceMotion })
      }
    }
    const onShow = () => {
      closeAttachMenu()
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
        closeAttachMenu,
      ),
    ]
    return () => listeners.forEach((listener) => listener?.remove())
  }, [reduceMotion, closeAttachMenu])

  return {
    consultIntro,
    conversationId,
    contextLabel,
    dismissContext: () => setContextDismissed(true),
    t,
    insets,
    router,
    isDarkMode,
    inputMessage,
    setInputMessage,
    historyOpen,
    setHistoryOpen,
    renameTarget,
    setRenameTarget,
    ...attachments,
    inputRef,
    messages,
    isTyping,
    isSending,
    isLoadingConversation,
    category,
    setCategory,
    listRef,
    isNearBottomRef,
    canSend,
    bodyStyle,
    toastStyle,
    restBottomInset,
    handleHistoryPress,
    handleNewChat,
    handleSelectHistory,
    handleRenamePress,
    handleDeletePress,
    handleRenameConfirm,
    handleFaqPress,
    handleSend,
    handleCopy,
    showToast,
    chatHistoryList,
    isFetching,
    historyError,
    refetchHistory,
    regenerateLastMessage,
    stopGenerating,
  }
}
export type ConsultScreenModel = ReturnType<typeof useConsultScreen>
