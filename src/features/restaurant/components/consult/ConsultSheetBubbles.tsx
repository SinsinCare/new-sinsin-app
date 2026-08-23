/**
 * 상담 시트의 말풍선 두 개. **`/consult` 의 `UserBubble`/`AssistantBubble` 과 다른 물건이다.**
 *
 * ## 왜 그 둘을 재사용하지 않았나
 *
 * 시각이 정반대다(실측):
 *
 * | | `/consult` | 이 시트(시안) |
 * |---|---|---|
 * | 사용자 | 잉크 반전면(#1D1E20)에 흰 글자, radius 20 | 연분홍 `primary.primaryWeak`, radius 16 |
 * | 어시스턴트 | **버블 없음** — 전폭 마크다운 | 회색 버블 + 마스코트 아바타 |
 * | 액션 | 복사 + 답변 다시 받기 | 복사 + 공유 + **답변 다시 받기**(아래) |
 *
 * 그 파일은 상담 화면의 **정본**이라 한 글자도 바꾸지 않는다. 대신 재사용할 수 있는 것은
 * 전부 거기서 가져온다 — MarkdownIt 인스턴스, 줄바꿈 규칙, 스타일 공장, 스트리밍 훅,
 * 마스코트. 갈리면 안 되는 것은 **답변을 그리는 방식**이지 면의 색이 아니다.
 *
 * ## 시안에 없는 `답변 다시 받기` 를 왜 넣었나
 *
 * 스트림이 끊기면 `useChat` 이 실패 말풍선을 세우는데, 그 문구가 전부
 * "아래 **‘답변 다시 받기’** 를 눌러 주세요" 로 끝난다(`chatFailureCopy.ts` 다섯 갈래 전부).
 * 시안대로 복사·공유만 두면 **없는 버튼을 누르라고 안내하는** 의료 답변 표면이 된다 —
 * 실패에서 빠져나올 길이 컴포저에 질문을 다시 치는 것뿐이다.
 * 그래서 `/consult` 와 **같은 문구**(`consult.regenerate`)로 같은 자리에 붙인다.
 *
 * 조건도 `/consult` 와 같다: **마지막 어시스턴트 메시지에만**. 지난 답변 밑에 두면 눌러도
 * 그 턴이 아니라 마지막 질문이 다시 생성되고, 누른 답변은 그대로 남는다. 이 컴포넌트는 그
 * 판단을 하지 않는다 — 호스트가 마지막 답변에만 `onRegenerate` 를 넘기고, 없으면 안 그린다.
 *
 * ## 마크다운 팔레트만은 새로 뜬다
 *
 * 상담 화면의 팔레트는 *전폭 배경* 위에 얹히는 값이다. `surface`/`codeBg` 가 #F5F6F8 /
 * #F2F3F5 인데 이 시트의 버블 면은 `background.lower` = #f7f7f7 이다 — 그대로 쓰면
 * **인용과 코드 블록이 배경과 같은 색이 되어 사라진다.** 그래서 버블 면 위에서 보이는
 * 한 벌을 새로 만든다(인용·코드는 `background.default`, 즉 버블보다 한 단 밝은/어두운 면).
 *
 * ## 사용자 버블 본문은 원문이 아니다
 *
 * 전송된 원문에는 `[식당]`/`[메뉴]` 컨텍스트 블록이 붙어 있다(`restaurantConsultMessage.ts`).
 * 버블은 `parseRestaurantConsultMessage` 가 되돌린 **질문 한 줄만** 그린다. 파싱이 안 되면
 * (손으로 친 후속 질문) 원문 그대로가 곧 질문이다.
 */

import { memo, useMemo } from "react"
import { Pressable, StyleSheet, type TextStyle } from "react-native"
import Markdown from "react-native-markdown-display"
import { useTranslation } from "react-i18next"

import { V2HStack, V2Icon, V2Text, V2VStack } from "@/src/design-system-v2"
import {
  radius,
  semanticDark,
  semanticLight,
  spacing,
  type SemanticColorSet,
} from "@/src/design-system-v2/tokens"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import {
  AssistantAvatar,
  makeMarkdownStyles,
  markdownItInstance,
  markdownRules,
  useSmoothStreamingText,
} from "@/src/features/consultation/components/ChatMessageBubble"
import type { Message } from "@/src/types/chat"

import { parseRestaurantConsultMessage } from "../../consult/restaurantConsultMessage"
import {
  CONSULT_ACTION_ROW_GAP,
  CONSULT_AVATAR,
  CONSULT_AVATAR_GAP,
  CONSULT_BUBBLE_PAD_X,
  CONSULT_BUBBLE_PAD_Y,
  CONSULT_BUBBLE_TEXT,
  CONSULT_GUTTER,
} from "./consultSheetMetrics"

/** 복사·공유 글리프. `/consult` 의 액션 아이콘과 같은 18 이다(시안 잉크 13.3). */
const ACTION_ICON = 18

/** 액션 아이콘 사이 4 — 시안의 중심 피치 22(= 18 + 4)를 그대로 쓴다. */
const ACTION_GAP = spacing[4]

/**
 * 터치 상자는 **`hitSlop` 이 만든다.** 아이콘 사이를 벌려도 상자는 커지지 않는다 —
 * 예전 머리말이 "22 면 터치 상자가 22pt 폭이 된다" 며 피치를 24 로 벌려 둔 것은 사실이 아니다.
 *
 * 간격이 실제로 정하는 것은 **겹침**이다. 사방 8 을 주면 두 상자가 `16 - 간격` 만큼 겹치고,
 * 겹친 자리는 나중에 그린 쪽(공유)이 가져간다 → 피치 22 에서는 **복사 글리프의 오른쪽 4pt 를
 * 눌러도 공유가 열린다.** 그래서 안쪽 슬롭은 간격의 절반까지만 주고, 대신 위아래를 넓혔다.
 * 위는 답변 버블, 아래는 다음 질문 버블 — 둘 다 누를 수 있는 것이 아니라 **뺏기는 것이 없다.**
 * 결과 상자는 28×42 로 사방 8(34×34)보다 넓다.
 */
const SLOP_INNER = ACTION_GAP / 2
const HIT_COPY = {
  top: spacing[12],
  bottom: spacing[12],
  left: spacing[8],
  right: SLOP_INNER,
}
const HIT_SHARE = {
  top: spacing[12],
  bottom: spacing[12],
  left: SLOP_INNER,
  right: SLOP_INNER,
}
const HIT_REGENERATE = {
  top: spacing[12],
  bottom: spacing[12],
  left: SLOP_INNER,
  right: spacing[8],
}

/**
 * `답변 다시 받기` 라벨. `/consult` 의 같은 버튼과 **같은 12/18 SemiBold** 다 —
 * 이름이 같은 버튼이 화면마다 다른 크기로 서면 같은 물건으로 안 읽힌다.
 * 12/18 조합의 타이포 토큰은 없다(`subtext.small` 은 12/16 Regular).
 * `V2Text` 가 `fontWeight` 를 Pretendard face 로 바꾸므로 서체는 지켜진다.
 */
const REGENERATE_LABEL: TextStyle = {
  fontSize: 12,
  fontWeight: "600",
  lineHeight: 18,
}

/**
 * 마지막 블록이 이미 8 을 갖고 있으므로 버블 아래 안여백은 그만큼 뺀다.
 *
 * `makeMarkdownStyles` 의 `paragraph`·`bullet_list`·`code_block` 은 전부 `marginBottom: 8`
 * 이다. 12 를 그대로 주면 한 문단짜리 답변(대부분)이 위 12 / 아래 20 으로 눈에 띄게
 * 기운다. 4 + 8 = 12 로 위아래가 맞는다.
 */
const ASSISTANT_PAD_BOTTOM = CONSULT_BUBBLE_PAD_Y - 8

function bubbleMarkdown(colors: SemanticColorSet) {
  const styles = makeMarkdownStyles({
    text: colors.label.normal,
    muted: colors.label.neutral,
    // 버블 면(`background.lower`)보다 한 단 다른 면. 같은 값을 주면 인용·코드가 안 보인다.
    surface: colors.background.default,
    divider: colors.line.normal,
    codeBg: colors.background.default,
    link: colors.accentForeground.green,
  })
  return {
    ...styles,
    // 이 표면의 읽기 리듬은 15/23 이다(`consultSheetMetrics` 의 `CONSULT_BUBBLE_TEXT`).
    body: { ...styles.body, ...CONSULT_BUBBLE_TEXT },
  }
}

/*
  모듈 수준에서 두 벌을 미리 만든다 — `/consult` 가 `markdownStylesLight`/`Dark` 를 그렇게
  두는 것과 같은 이유다. 렌더마다 `StyleSheet.create` 를 돌리면 대화가 길수록 비싸진다.
*/
const MARKDOWN_LIGHT = bubbleMarkdown(semanticLight)
const MARKDOWN_DARK = bubbleMarkdown(semanticDark)

export const ConsultUserBubble = memo(function ConsultUserBubble({
  message,
}: {
  message: Message
}) {
  const scheme = useAppColorScheme() === "dark" ? "dark" : "light"
  const colors = scheme === "dark" ? semanticDark : semanticLight
  const question = useMemo(
    () =>
      parseRestaurantConsultMessage(message.content)?.question ??
      message.content,
    [message.content],
  )

  if (!question) return null

  return (
    <V2HStack justify="flex-end" paddingHorizontal={CONSULT_GUTTER}>
      <V2VStack
        style={[
          styles.userBubble,
          { backgroundColor: colors.primary.primaryWeak },
        ]}
      >
        <V2Text color={colors.label.normal} style={CONSULT_BUBBLE_TEXT}>
          {question}
        </V2Text>
      </V2VStack>
    </V2HStack>
  )
})

export const ConsultAssistantBubble = memo(function ConsultAssistantBubble({
  message,
  onCopy,
  onShare,
  onRegenerate,
}: {
  message: Message
  /*
    내용은 이 컴포넌트가 알고 있으므로 인자로 넘긴다. 호출부가
    `onCopy={() => handle(msg.content)}` 로 감싸면 매 렌더 새 함수가 되어 memo 가 죽는다
    (`AssistantBubble` 이 같은 주석을 달고 있는 이유).
  */
  onCopy?: (content: string) => void
  onShare?: (content: string) => void
  /**
   * `useChat` 의 `regenerateLastMessage`. **마지막 어시스턴트 메시지에만** 넘긴다 —
   * 이 값이 있으면 액션 행에 `답변 다시 받기` 가 서고, 없으면 안 선다(머리말 참고).
   * 인자 없는 안정된 함수여야 memo 가 산다(`useChat` 이 `useCallback` 으로 돌려준다).
   */
  onRegenerate?: () => void
}) {
  const { t } = useTranslation()
  const scheme = useAppColorScheme() === "dark" ? "dark" : "light"
  const colors = scheme === "dark" ? semanticDark : semanticLight
  const displayed = useSmoothStreamingText(message.content)
  const isRevealing = displayed !== message.content

  return (
    <V2VStack paddingHorizontal={CONSULT_GUTTER} gap={CONSULT_ACTION_ROW_GAP}>
      {/* 마스코트는 **버블 하단**에 선다(시안: 아바타 바닥 = 버블 바닥). */}
      <V2HStack align="flex-end" gap={CONSULT_AVATAR_GAP}>
        <AssistantAvatar size={CONSULT_AVATAR} />
        <V2VStack
          flex={1}
          style={[
            styles.assistantBubble,
            { backgroundColor: colors.background.lower },
          ]}
        >
          <Markdown
            markdownit={markdownItInstance}
            rules={markdownRules}
            style={scheme === "dark" ? MARKDOWN_DARK : MARKDOWN_LIGHT}
          >
            {displayed}
          </Markdown>
        </V2VStack>
      </V2HStack>
      {/* 액션은 답변이 다 드러난 뒤에만 — 쓰는 중에 아이콘이 밀려다니지 않게. */}
      {!isRevealing && (
        <V2HStack gap={ACTION_GAP} align="center" style={styles.actions}>
          <Pressable
            onPress={() => onCopy?.(message.content)}
            hitSlop={HIT_COPY}
            accessibilityRole="button"
            accessibilityLabel={t("consult.copyAnswer")}
            style={pressedStyle}
          >
            {/*
              시안 실측 rgb(108,109,112) = `label.neutral` 이다(흰 배경 대비 5.2:1).
              `label.alternative` 는 rgb(153,154,156)·2.8:1 로, 답변에 붙는 유일한 액션
              어포던스가 배경에 묻힌다. 흐리게 두고 싶어도 여기서는 아니다.
            */}
            <V2Icon
              name="copy"
              size={ACTION_ICON}
              color={colors.label.neutral}
            />
          </Pressable>
          <Pressable
            onPress={() => onShare?.(message.content)}
            hitSlop={HIT_SHARE}
            accessibilityRole="button"
            accessibilityLabel={t("restaurant.consult.shareAnswer")}
            style={pressedStyle}
          >
            <V2Icon
              name="share"
              size={ACTION_ICON}
              color={colors.label.neutral}
            />
          </Pressable>
          {onRegenerate && (
            <Pressable
              onPress={onRegenerate}
              hitSlop={HIT_REGENERATE}
              accessibilityRole="button"
              accessibilityLabel={t("consult.regenerate")}
              style={pressedStyle}
            >
              {/*
                글리프만 두지 않는다 — 실패 말풍선이 **이름으로** 이 버튼을 가리킨다
                ("아래 ‘답변 다시 받기’ 를 눌러 주세요"). 이름이 안 보이면 안내가 끊긴다.
                왼쪽 여백 8 은 아이콘 사이 4 와 합쳐 `/consult` 의 액션 간격 12 가 된다 —
                라벨이 붙은 컨트롤이 글리프 짝을 파고들지 않게.
              */}
              <V2HStack
                align="center"
                gap={ACTION_GAP}
                style={styles.regenerate}
              >
                <V2Icon
                  name="refresh"
                  size={ACTION_ICON}
                  color={colors.label.neutral}
                />
                <V2Text color={colors.label.neutral} style={REGENERATE_LABEL}>
                  {t("consult.regenerate")}
                </V2Text>
              </V2HStack>
            </Pressable>
          )}
        </V2HStack>
      )}
    </V2VStack>
  )
})

const pressedStyle = ({ pressed }: { pressed: boolean }) => ({
  opacity: pressed ? 0.55 : 1,
})

const styles = StyleSheet.create({
  userBubble: {
    maxWidth: "78%",
    borderRadius: radius["2xl"],
    paddingHorizontal: CONSULT_BUBBLE_PAD_X,
    paddingVertical: CONSULT_BUBBLE_PAD_Y,
  },
  /*
    `flex: 1` 이다 — 마크다운은 블록 레이아웃이라 내용 폭으로 줄어들지 않는다. 시안도
    답변 버블이 늘 전폭(x 70–355)이라 이쪽이 시안과 같다. 사용자 버블만 내용 폭이다.
  */
  assistantBubble: {
    borderRadius: radius["2xl"],
    paddingHorizontal: CONSULT_BUBBLE_PAD_X,
    paddingTop: CONSULT_BUBBLE_PAD_Y,
    paddingBottom: ASSISTANT_PAD_BOTTOM,
  },
  /** 아이콘 왼쪽 끝이 버블 왼쪽 끝과 같은 x 에 선다(시안 실측 71.33 ≈ 20+40+10). */
  actions: { marginLeft: CONSULT_AVATAR + CONSULT_AVATAR_GAP },
  regenerate: { paddingLeft: spacing[8] },
})
