/**
 * 식당 상세의 `AI 식단 상담` — 시트와 그 대화를 **함께 소유하는** 호스트.
 *
 * ## 왜 `useChat()` 이 시트 밖(여기)에 있나 — 되돌리면 대화가 사라진다
 *
 * `V2BottomSheet` 은 닫힘 애니메이션이 끝나면 `!rendered` 에서 `return null` 한다.
 * 즉 **children 이 통째로 언마운트된다.** `useChat` 을 시트 children 안에 두면 시트를 닫을
 * 때마다 정리 이펙트가 `abort()` 하고 대화가 통째로 없어진다 — "물어보고 닫았다가 다시
 * 열었더니 아무것도 없다".
 *
 * 그래서 이 호스트가 훅을 갖는다. 상세 화면이 사는 동안 항상 마운트돼 있으므로,
 *  - 시트를 닫아도 스트림은 계속 흘러 답이 채워지고 다시 열면 그대로 있다.
 *  - 화면을 떠나면 상세 화면의 인스턴스 키 리마운트가 이 호스트를 언마운트하고,
 *    그때 `useChat` 의 정리가 `abort()` 한다(서버는 프레임도 로그도 없이 조용히 끊는다).
 *
 * ## 전송은 두 렌더에 걸쳐 일어난다 (되돌리면 분류가 어긋난다)
 *
 * `setCategory` 는 상태다. `useChat` 의 `categoryRef.current = category` 는 **렌더 중** 갱신
 * 되므로, 같은 틱에 `sendMessage` 를 부르면 **이전 category** 가 실려 나간다. 그래서 문장을
 * `pending` 에 얹어 두고 `category === "FOOD_DIET"` 가 된 다음 렌더에 보낸다 —
 * 식사·검진·범용 세 경로가 이미 같은 모양이다(`app/consult.tsx`).
 *
 * ## 재주입 방지 키는 `requestId` 다 (프롬프트 문자열이 아니다)
 *
 * 문자열을 키로 쓰면 **같은 질문을 두 번 눌렀을 때 두 번째가 조용히 무시된다.**
 * 호출부는 매번 다른 `requestId` 를 준다(`restaurant-{id}-{kind}-{Date.now()}`).
 *
 * ## 두 번째 질문은 `resetChat()` 이 아니다
 *
 * 같은 대화에 한 턴 더 붙인다. 리셋하면 앞 대화를 버리는데 시안에 그런 신호가 없고,
 * 서버 히스토리(최근 20턴)가 앞 턴의 식당 컨텍스트를 계속 물고 있어 답이 이어진다.
 *
 * ## 컨텍스트는 **추천 질문마다** 실린다 (손으로 친 문장은 평문이다)
 *
 * 예전 머리말은 "첫 메시지에만" 이라고 적어 두었지만 코드는 그렇지 않았고, **코드가 맞다.**
 * 두 번째로 누른 `비교` 질문이 지목하는 메뉴는 앞 턴에 실린 적이 없다 — 아껴 두면 모델이
 * 그 두 메뉴의 숫자를 아예 못 본 채 답한다. 대신 한 번에 실리는 메뉴는 **2건까지**라
 * (`RESTAURANT_CONSULT_MENU_LIMIT`) 블록이 히스토리(최근 20턴)를 밀어낼 만큼 커지지 않는다.
 *
 * 컴포저에서 손으로 친 문장은 컨텍스트 없이 평문 그대로 나간다. 그리고 실려 나가는 것은
 * **메뉴 이름과 숫자뿐**이다 — `안전/주의/제한` 라벨을 넣으면 모델이 "이 메뉴는 안전해요" 로
 * 되받고 그 문장이 서버의 `unsupported_reassurance` 에 걸려 **답변 전체가 폐기된다.**
 *
 * ## 보낼 문장은 경로와 무관하게 `pending` 을 거친다
 *
 * 추천 질문도 손으로 친 문장도 곧장 보내지 않는다. 분류(`setCategory`)가 반영된 **다음
 * 렌더**에 보내야 하고(아래 §전송은 두 렌더), 스트리밍 중이면 `useChat.sendMessage` 가
 * `inFlightRef` 에서 **한 줄 만에 조용히 return** 하기 때문이다. 그래서 `pending` 은
 * 보낼 수 있게 될 때까지 **버리지 않고 남는다** — 버리면 경고도 오류도 없이 질문이 사라지고,
 * `handledRef` 는 이미 소비돼 같은 `requestId` 로는 재시도조차 안 된다.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FlatList, Keyboard, StyleSheet, View } from "react-native"
import * as Clipboard from "expo-clipboard"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { V2BottomSheet, V2VStack } from "@/src/design-system-v2"
import { spacing } from "@/src/design-system-v2/tokens"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { TypingIndicator } from "@/src/features/consultation/components/TypingIndicator"
import { useChat } from "@/src/features/consultation/hooks/useChat"
import { dynamicKey } from "@/src/i18n/dynamicKey"
import { showSuccessToast } from "@/src/lib/toast"
import { afterModalTransitions } from "@/src/shared/components/appModalGate"
import { ModalOverlayHost } from "@/src/shared/components"
import { shareContent } from "@/src/shared/utils/share"
import type { Message } from "@/src/types/chat"

import { cuisineTypeLabelKey } from "../../data/filterCatalog"
import {
  buildRestaurantConsultMessage,
  pickConsultMenuFacts,
} from "../../consult/restaurantConsultMessage"
import type { ConsultQuestion } from "../../consult/types"
import type { CuisineType, MenuItemDto } from "../../types"
import {
  ConsultAssistantBubble,
  ConsultUserBubble,
} from "./ConsultSheetBubbles"
import { ConsultSheetComposer } from "./ConsultSheetComposer"
import { ConsultSheetDisclaimer } from "./ConsultSheetDisclaimer"
import { ConsultSheetEmpty } from "./ConsultSheetEmpty"
import { ConsultSheetHeader } from "./ConsultSheetHeader"
import {
  CONSULT_ANSWER_TAIL_GAP,
  CONSULT_GUTTER,
  CONSULT_TOP_GAP,
  CONSULT_TURN_GAP,
} from "./consultSheetMetrics"

/**
 * 서버 `QUESTION_CATEGORIES` 에 식당용 값이 없고(`FOOD_DIET|MEDICATION|LIFESTYLE|SYMPTOMS|
 * EXAM|NONE|OTHER`), 분류는 주입되는 컨텍스트를 **하나도 바꾸지 않는다**(`contextBuilder` 가
 * category 를 인자로 받지 않는다). 새 값을 만들 이유가 0 이라 식이 상담과 같은 칸을 쓴다.
 */
const CONSULT_CATEGORY = "FOOD_DIET" as const

/** 시안 실측: 알약 바닥에서 키보드까지 14. 키보드가 없으면 safe-area(최소 14). */
const COMPOSER_REST_INSET = 14

export interface RestaurantConsultRequest {
  question: ConsultQuestion
  /** 매번 달라야 한다. 같으면 두 번째 탭이 조용히 무시된다(머리말 §재주입 방지). */
  requestId: string
}

export function RestaurantConsultSheetHost({
  visible,
  onClose,
  restaurantId,
  restaurantName,
  cuisineType,
  menus,
  request,
}: {
  visible: boolean
  onClose: () => void
  /** 계측용. `restaurant_ai_consult_send` 가 이 값 없이는 어느 식당인지 못 센다. */
  restaurantId: number
  restaurantName: string
  cuisineType: CuisineType
  menus: MenuItemDto[]
  /** 열면서 자동 전송할 질문. `null` 이면 빈 상태로 연다. */
  request: RestaurantConsultRequest | null
}) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const {
    messages,
    isTyping,
    isSending,
    category,
    setCategory,
    sendMessage,
    regenerateLastMessage,
  } = useChat()

  const [input, setInput] = useState("")
  const [pending, setPending] = useState<string | null>(null)
  const [keyboardUp, setKeyboardUp] = useState(false)

  const listRef = useRef<FlatList<Message>>(null)
  const handledRef = useRef<string | null>(null)
  /** 바닥 근처에서 읽고 있을 때만 스트리밍을 따라간다 — 위로 올려 읽는 중이면 붙잡지 않는다. */
  const isNearBottomRef = useRef(true)
  /*
    전송한 턴 수. `messages` 를 useCallback 의존성에 넣으면 메시지가 올 때마다 전송 함수가
    새로 만들어져 대기-후-전송 이펙트가 헛돈다. 렌더 중 갱신하는 ref 로 읽는다(`useChat` 의
    `messagesRef` 와 같은 수법).
  */
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const translate = useCallback(
    (key: string, options?: Record<string, unknown>) =>
      String(t(key as never, options as never)),
    [t],
  )

  const cuisineLabel = useMemo(
    () => translate(dynamicKey(cuisineTypeLabelKey(cuisineType))),
    [cuisineType, translate],
  )

  const send = useCallback(
    (content: string) => {
      const turn =
        messagesRef.current.filter((message) => message.role === "user")
          .length + 1
      trackAnalyticsEvent("restaurant_ai_consult_send", {
        restaurant_id: restaurantId,
        turn,
      })
      void sendMessage(content)
    },
    [restaurantId, sendMessage],
  )

  /* 1단계 — 질문이 들어오면 분류를 세우고 문장을 만들어 대기시킨다. */
  useEffect(() => {
    if (!request) return
    if (handledRef.current === request.requestId) return
    handledRef.current = request.requestId

    setCategory(CONSULT_CATEGORY)
    setPending(
      buildRestaurantConsultMessage({
        question: request.question.text,
        restaurantName,
        cuisineLabel,
        // 질문이 **실제로 지목한** 메뉴만. 비교 질문이면 2건, 나머지는 0건이다.
        menus: pickConsultMenuFacts(menus, request.question.menuNames),
        t: translate,
      }),
    )
  }, [request, restaurantName, cuisineLabel, menus, setCategory, translate])

  /* 2단계 — 분류가 반영된 **다음 렌더**에 보낸다(머리말 §전송은 두 렌더). */
  useEffect(() => {
    if (!pending) return
    if (category !== CONSULT_CATEGORY) return
    /*
      스트리밍 중이면 보내지 않는다 — 그리고 **`pending` 을 비우지도 않는다.**

      `useChat.sendMessage` 는 `inFlightRef.current` 가 서 있으면 첫 줄에서 return 한다
      (`useChat.ts` — `if ((!trimmed && !imageUri) || inFlightRef.current) return`).
      그 플래그는 SSE 가 끝나는 `finally` 까지 서 있으므로, 스트리밍 중에 추천 질문을 누르면
      전송은 일어나지 않는데 여기서 `setPending(null)` 로 문장을 버리는 순간 **경고도 오류도
      없이 질문이 사라진다.** `handledRef` 는 1단계에서 이미 소비됐고 `requestId` 도 그대로라
      다시 눌러도 아무 일이 없다. 남겨 두면 `isSending` 이 내려가는 렌더에 이 이펙트가 다시
      돌아 그대로 나간다 — 그래서 `isSending` 이 의존성에 있다.

      계측(`restaurant_ai_consult_send`)이 `send` 안에 있는 것도 같은 이유다. 이 가드를
      지우면 전송 없는 턴이 지표에만 남아 "열림 대비 전송" 이 통째로 거짓이 된다.
    */
    if (isSending) return
    send(pending)
    setPending(null)
  }, [pending, category, isSending, send])

  /*
    바닥 여백을 가르는 boolean 하나. **위치를 만드는 값이 아니라 여백 하나**라 gorhom 의
    키보드 보정과 두 겹이 되지 않는다. iOS 는 Will 과 Did 를 **둘 다** 들어야 한다 —
    하나만 들으면 두 경우 중 하나를 놓친다(`app/consult.tsx` 2026-08-03 실측).
  */
  useEffect(() => {
    const up = () => setKeyboardUp(true)
    const down = () => setKeyboardUp(false)
    const subscriptions = [
      Keyboard.addListener("keyboardWillShow", up),
      Keyboard.addListener("keyboardDidShow", up),
      Keyboard.addListener("keyboardWillHide", down),
      Keyboard.addListener("keyboardDidHide", down),
    ]
    return () => subscriptions.forEach((subscription) => subscription.remove())
  }, [])

  /* 새 메시지·타이핑이 붙으면 끝으로. 한 박자 뒤에 재는 것은 레이아웃이 끝난 뒤여야 해서다. */
  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true })
    }, 100)
    return () => clearTimeout(timer)
  }, [messages.length, isTyping])

  const handleCopy = useCallback(
    (content: string) => {
      void Clipboard.setStringAsync(content)
      // 시트는 RN Modal 안이라 루트 토스트가 모달 뒤에 그려진다 — 아래 `ModalOverlayHost` 가
      // 모달 안에 호스트를 하나 더 세워 두는 이유다.
      showSuccessToast(t("consult.copied"))
    },
    [t],
  )

  const handleShare = useCallback(
    (content: string) => {
      /*
        `Share.share` 를 직접 부르지 않는다. 공유 시트는 RN 모달이 아니라 **네이티브
        present** 이고, iOS 는 present/dismiss 가 진행 중이면 새 present 를 **조용히
        거부한다**(예외도 없고 아무 일도 안 일어난다). `shareContent` 가 그 대기를 안에서 한다.
      */
      void shareContent({
        scope: "restaurant-consult-answer",
        title: restaurantName,
        body: content,
      })
    },
    [restaurantName],
  )

  const handleReferences = useCallback(() => {
    // 시트를 먼저 닫는다 — 네이티브 모달이 떠 있는 동안 라우터로 밀면 새 화면이 모달 뒤로 간다.
    onClose()
    void (async () => {
      await afterModalTransitions()
      router.push("/(settings)/medical-reference")
    })()
  }, [onClose])

  /*
    컴포저에서 손으로 친 문장. **추천 질문과 같은 통로(`pending`)로 보낸다.**

    곧장 `send(text)` 를 부르면 두 가지가 어긋난다.
     1. 빈 상태(`질문하기`)로 열어 처음부터 손으로 친 대화는 `setCategory` 를 한 번도
        타지 않아 서버에 `NONE` 으로 생성된다 — 같은 시트에서 시작한 대화인데 추천 질문으로
        연 것과 분류가 갈린다.
     2. 같은 틱에 `setCategory` + `sendMessage` 를 하면 `categoryRef.current` 가 **렌더 중**
        갱신되는 값이라 **이전 분류**가 실려 나간다(머리말 §전송은 두 렌더).
    `pending` 에 얹어 두면 2단계 이펙트가 분류·스트리밍을 다 보고 한 자리에서 보낸다.
  */
  const handleSend = useCallback(() => {
    const text = input.trim()
    // 이미 대기 중인 문장이 있으면 덮어쓰지 않는다 — 덮으면 앞 문장이 조용히 사라진다.
    if (!text || isSending || pending) return
    setInput("")
    setCategory(CONSULT_CATEGORY)
    setPending(text)
  }, [input, isSending, pending, setCategory])

  /** 바닥에서 120pt 안쪽일 때만 스트리밍을 따라간다 — 위로 올려 읽는 중이면 붙잡지 않는다. */
  const handleScroll = useCallback(
    (event: {
      nativeEvent: {
        contentOffset: { y: number }
        contentSize: { height: number }
        layoutMeasurement: { height: number }
      }
    }) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent
      isNearBottomRef.current =
        contentSize.height - contentOffset.y - layoutMeasurement.height < 120
    },
    [],
  )

  /*
    `답변 다시 받기` 는 **마지막 답변에만** 선다. 지난 답변 밑에 두면 눌러도 그 턴이 아니라
    마지막 질문이 다시 생성되고, 누른 답변은 그대로 남는다(`app/consult.tsx` 와 같은 판단).
    `ConsultAssistantBubble` 은 그 판정을 하지 않는다 — `onRegenerate` 가 있으면 그리고
    없으면 안 그린다. 그래서 판정이 여기 있다.
  */
  const lastAssistantId = useMemo(
    () => messages.findLast((message) => message.role === "assistant")?.id,
    [messages],
  )

  const renderItem = useCallback(
    ({ item }: { item: Message }) =>
      item.role === "user" ? (
        <ConsultUserBubble message={item} />
      ) : (
        <ConsultAssistantBubble
          message={item}
          onCopy={handleCopy}
          onShare={handleShare}
          /*
            삼항으로 **안정된 함수 하나**를 넘긴다. `() => regenerateLastMessage()` 로 감싸면
            매 렌더 새 함수가 되어 버블의 `memo` 가 죽는다(스트리밍 중 전 목록이 다시 그려진다).
          */
          onRegenerate={
            item.id === lastAssistantId ? regenerateLastMessage : undefined
          }
        />
      ),
    [handleCopy, handleShare, lastAssistantId, regenerateLastMessage],
  )

  const hasMessages = messages.length > 0

  return (
    <V2BottomSheet
      surface="restaurant_ai_consult"
      layout="fill"
      visible={visible}
      onClose={onClose}
    >
      <ConsultSheetHeader onClose={onClose} />

      <View style={styles.body}>
        {hasMessages ? (
          <FlatList
            ref={listRef}
            style={styles.list}
            data={messages}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ItemSeparatorComponent={TurnSpacer}
            /* 상태말도 하나의 턴이다 — 마지막 메시지와 턴 간격만큼 띄운다. */
            ListFooterComponent={
              isTyping ? (
                <V2VStack
                  paddingHorizontal={CONSULT_GUTTER}
                  paddingTop={CONSULT_TURN_GAP}
                >
                  <TypingIndicator />
                </V2VStack>
              ) : null
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            /*
              평범한 RN `FlatList` 다. `V2BottomSheet` 은 `enableContentPanningGesture={false}`
              라 본문 스크롤과 시트가 손짓을 다투지 않는다 — `V2SheetScrollView` 가 평범한
              RN `ScrollView` 인 것과 같은 근거다. `BottomSheetFlatList` 는 콘텐츠 팬이 켜진
              다중 스냅 시트(지도)의 물건이라 여기 쓰면 오히려 스크롤이 시트에 먹힌다.
            */
            bounces={false}
            overScrollMode="never"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScroll={handleScroll}
            scrollEventThrottle={32}
            onContentSizeChange={(_width, height) => {
              // `scrollToEnd` 는 내부 측정치가 한 박자 늦어 끝에 못 미친다 —
              // 콜백이 주는 최종 높이로 직접 간다(범위 밖 오프셋은 클램프된다).
              if (!isNearBottomRef.current) return
              listRef.current?.scrollToOffset({
                offset: Math.max(0, height),
                animated: false,
              })
            }}
            // 말풍선 높이가 제각각이라 `getItemLayout` 을 줄 수 없다. 창을 좁게 잡는다.
            initialNumToRender={12}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews
          />
        ) : (
          <ConsultSheetEmpty />
        )}
      </View>

      {/* 조건 없이 그린다. 이유는 `ConsultSheetDisclaimer` 머리말 — 조건을 붙이지 말 것. */}
      <ConsultSheetDisclaimer onOpenReferences={handleReferences} />

      <ConsultSheetComposer
        value={input}
        onChangeText={setInput}
        onSend={handleSend}
        canSend={input.trim().length > 0 && !isSending}
        bottomInset={
          keyboardUp
            ? COMPOSER_REST_INSET
            : Math.max(insets.bottom, COMPOSER_REST_INSET)
        }
      />

      {/* RN Modal 안에서 뜨는 알림(복사 토스트·확인창)은 모달 안에 호스트가 있어야 보인다. */}
      <ModalOverlayHost />
    </V2BottomSheet>
  )
}

const keyExtractor = (message: Message) => String(message.id)

/**
 * 턴 사이 간격. 인라인 화살표로 넘기면 매 렌더 새 타입이 되어 목록이 다시 그려진다.
 *
 * 두 값인 이유(시안 실측): 어시스턴트 버블 **아래**에는 복사·공유·재생성 액션 행이 붙는데,
 * 시안은 그 행을 턴 간격 **안에** 넣는다(버블 바닥 → 아이콘 → 다음 버블 합 28). 여기서
 * 어느 앞 메시지에나 24 를 주면 액션 행 높이가 그 위에 더해져 47 이 된다 — 시안의 1.7배다.
 * 그래서 앞이 어시스턴트일 때만 6 으로 줄인다.
 *
 * 액션 행을 음수 마진으로 턴 간격 위에 겹쳐 올리는 길도 있었지만 **안드로이드는 부모 상자
 * 밖으로 나간 자식에게 터치를 전달하지 않는다** — 복사·공유가 보이는데 안 눌린다.
 */
function TurnSpacer({ leadingItem }: { leadingItem?: Message }) {
  const afterAnswer = leadingItem?.role === "assistant"
  return (
    <View style={afterAnswer ? styles.answerTailSpacer : styles.turnSpacer} />
  )
}

const styles = StyleSheet.create({
  /*
    목록과 빈 상태가 **같은 상자**를 쓴다. 고정 스냅 시트이고 `V2BottomSheet` 이
    `layout="fill"` 에서 콘텐츠 컨테이너를 **흐름 안의 `flex:1` View** 로 두므로
    (절대 위치 + `bottom: 0` 이 아니다 — 그러면 gorhom 이 키보드 몫으로 비워 두는
    `paddingBottom` 을 먹는다. 근거는 `V2BottomSheet` 의 `layout` prop 머리말),
    여기 `flex: 1` 이 살아 있다. 키보드가 뜨면 gorhom 이 상자를 432 로 줄이는 만큼
    **목록만** 줄어들고 컴포저는 키보드 위에 남는다.
  */
  body: { flex: 1 },
  list: { flex: 1 },
  /* 위 36 은 시안 실측(빈 상태 제목 여백과 같은 값). 아래는 컴포저가 따로 띄운다. */
  listContent: { paddingTop: CONSULT_TOP_GAP, paddingBottom: spacing[16] },
  turnSpacer: { height: CONSULT_TURN_GAP },
  /* 앞이 답변일 때. 액션 행이 이 간격 안에 들어간다 — `TurnSpacer` 머리말 참고. */
  answerTailSpacer: { height: CONSULT_ANSWER_TAIL_GAP },
})
