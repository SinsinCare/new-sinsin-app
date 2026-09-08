import { Text as RNText } from "@/src/design-system-v2/primitives/NativeText"
import { consultCopyText } from "../lib/consultCopy"
import { useConsultResultReveal } from "../hooks/useConsultPresentation"
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated"
import { memo, useMemo } from "react"
import { useChatTranscript as useSmoothStreamingText } from "../hooks/useChatTranscript"
import { Pressable, StyleSheet } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import Markdown, { type RenderRules } from "react-native-markdown-display"
import {
  V2Box,
  V2HStack,
  V2Text,
  V2VStack,
  useV2Theme,
  borderWidth,
} from "@/src/design-system-v2"
import { Icon } from "@/src/shared/components/Icon"
import type { Message } from "@/src/types/chat"
import { Image } from "expo-image"
import { remoteImageSource } from "@/src/shared/images/remoteImageSource"
import { useTranslation } from "react-i18next"

import { parseRestaurantConsultMessage } from "@/src/features/restaurant/consult/restaurantConsultMessage"
import { parseFoodConsultMessage } from "../utils/foodConsultMessage"
import { parseExamConsultMessage } from "../utils/examConsultMessage"
import { resolveConsultUserCard } from "../utils/consultUserMessage"
import {
  markdownItInstance,
  normalizeAssistantMarkdown,
  keepMeasurementTogether,
} from "../utils/chatMarkdown"
import { FoodConsultCard } from "./FoodConsultCard"
import { ExamConsultCard } from "./ExamConsultCard"
import { StatsConsultCard } from "./StatsConsultCard"
import { parseStatsConsultMessage } from "../utils/statsConsultMessage"
import { ConsultDataCards } from "./ConsultDataCards"
import { ConsultActivityTrail } from "./ConsultActivityTrail"
import { USER_BUBBLE_BG, USER_BUBBLE_TEXT } from "./chatPalette"

// 아바타는 메시지마다 렌더됩니다. SVG 래퍼(base64 PNG 645KB)를 그대로 두면
// 말풍선 하나당 그 컴포넌트를 인스턴스화하게 되어 상담 탭 스크롤이 무너집니다.
const AVATAR_DARK = require("@/assets/images/Sin_dark.png")
const AVATAR_LIGHT = require("@/assets/images/Sin_light.png")

/** 채팅 본문 거터. 컴포저·화면 그리드(20)와 같은 선에 선다. */
export const CHAT_GUTTER = 20

/**
 * 파서·정규화의 정본은 `utils/chatMarkdown.ts` 다(`breaks: true` 의 근거도 거기).
 * 식당 상담 시트가 여기서 가져다 쓰므로 재수출을 유지한다 — 인스턴스를 나눠 쓰면
 * cjk-friendly 나 breaks 를 빠뜨린 판이 시트 쪽에 생기고, 그 화면은 여기 테스트로
 * 안 잡힌다.
 */
export { markdownItInstance, normalizeAssistantMarkdown }

/** 마크다운 본문이 쓰는 6색. 소비처가 자기 면에 맞는 한 벌을 떠서 넘긴다. */
export interface MarkdownPalette {
  text: string
  muted: string
  surface: string
  divider: string
  codeBg: string
  link: string
}

/**
 * 본문 15/24 를 기준으로 헤딩·리스트·구분선·인용까지 같은 결로 정돈한다.
 * 헤딩은 화면 제목이 아니라 답변 안의 소제목이라 크게 띄우지 않고,
 * 구분선·인용·코드는 면과 헤어라인으로만 위계를 만든다(보더리스 원칙).
 *
 * **팔레트를 인자로 받는 것이 요점이다.** 아래 두 벌(라이트·다크)은 *전폭 배경* 위에
 * 얹히는 값이라, 회색 버블(`background.lower`) 안에 그대로 쓰면 `surface`/`codeBg`
 * (#F5F6F8 / #F2F3F5)가 버블 면과 거의 같은 색이 되어 **인용과 코드가 사라진다.**
 * 그래서 식당 상담 시트는 이 함수를 부르되 자기 팔레트를 새로 떠서 넘긴다.
 */
export function makeMarkdownStyles(palette: MarkdownPalette) {
  return StyleSheet.create({
    body: {
      fontSize: 15,
      lineHeight: 24,
      color: palette.text,
      fontFamily: "Pretendard-Regular",
    },
    paragraph: { marginTop: 0, marginBottom: 8 },
    strong: {
      fontFamily: "Pretendard-Bold",
      fontWeight: "700",
    },
    em: { fontStyle: "italic" },
    link: { color: palette.link, textDecorationLine: "underline" },
    heading1: {
      fontSize: 18,
      lineHeight: 26,
      letterSpacing: -0.36,
      fontFamily: "Pretendard-Bold",
      fontWeight: "700",
      marginTop: 18,
      marginBottom: 6,
    },
    heading2: {
      fontSize: 17,
      lineHeight: 25,
      letterSpacing: -0.34,
      fontFamily: "Pretendard-Bold",
      fontWeight: "700",
      marginTop: 18,
      marginBottom: 6,
    },
    heading3: {
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: -0.32,
      fontFamily: "Pretendard-Bold",
      fontWeight: "700",
      marginTop: 16,
      marginBottom: 4,
    },
    heading4: {
      fontSize: 15.5,
      lineHeight: 23,
      fontFamily: "Pretendard-Bold",
      fontWeight: "700",
      marginTop: 14,
      marginBottom: 4,
    },
    heading5: {
      fontSize: 15,
      lineHeight: 23,
      fontFamily: "Pretendard-Bold",
      fontWeight: "700",
      marginTop: 12,
      marginBottom: 4,
    },
    heading6: {
      fontSize: 15,
      lineHeight: 23,
      fontFamily: "Pretendard-SemiBold",
      fontWeight: "600",
      marginTop: 12,
      marginBottom: 4,
    },
    hr: {
      height: borderWidth.thin,
      backgroundColor: palette.divider,
      marginVertical: 18,
    },
    bullet_list: { marginTop: 2, marginBottom: 8 },
    ordered_list: { marginTop: 2, marginBottom: 8 },
    list_item: {
      flexDirection: "row",
      marginVertical: 3,
    },
    bullet_list_icon: {
      color: palette.muted,
      fontSize: 15,
      lineHeight: 24,
      marginLeft: 4,
      marginRight: 10,
    },
    ordered_list_icon: {
      color: palette.muted,
      fontSize: 14,
      lineHeight: 24,
      fontFamily: "Pretendard-SemiBold",
      marginLeft: 4,
      marginRight: 8,
    },
    blockquote: {
      backgroundColor: palette.surface,
      borderLeftWidth: 3,
      borderLeftColor: palette.divider,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 2,
      marginVertical: 8,
      marginLeft: 0,
    },
    code_inline: {
      backgroundColor: palette.codeBg,
      borderWidth: 0,
      borderRadius: 5,
      paddingHorizontal: 5,
      fontSize: 13.5,
    },
    code_block: {
      backgroundColor: palette.codeBg,
      borderWidth: 0,
      borderRadius: 12,
      padding: 14,
      fontSize: 13,
      lineHeight: 20,
      marginVertical: 8,
    },
    fence: {
      backgroundColor: palette.codeBg,
      borderWidth: 0,
      borderRadius: 12,
      padding: 14,
      fontSize: 13,
      lineHeight: 20,
      marginVertical: 8,
    },
    table: {
      borderWidth: borderWidth.thin,
      borderColor: palette.divider,
      borderRadius: 10,
      marginVertical: 8,
      overflow: "hidden",
    },
    thead: {},
    th: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontFamily: "Pretendard-SemiBold",
      fontWeight: "600",
    },
    tr: {
      borderBottomWidth: borderWidth.thin,
      borderColor: palette.divider,
      flexDirection: "row",
    },
    td: { paddingHorizontal: 10, paddingVertical: 8 },
  })
}

// 한국어가 단어 중간에서 꺾이지 않게 본문 텍스트 그룹에 어절 줄바꿈을 건다.
// 답변을 그리는 다른 표면(식당 상담 시트)도 같은 규칙을 써야 줄바꿈이 갈리지 않는다.
export const markdownRules: RenderRules = {
  text: (node, _children, _parent, mdStyles, inheritedStyles = {}) => (
    <RNText key={node.key} style={[inheritedStyles, mdStyles.text]}>
      {keepMeasurementTogether(node.content)}
    </RNText>
  ),
  textgroup: (node, children, _parent, mdStyles) => (
    <RNText
      key={node.key}
      style={mdStyles.textgroup}
      lineBreakStrategyIOS="hangul-word"
      textBreakStrategy="balanced"
    >
      {children}
    </RNText>
  ),
}

/**
 * 마스코트 원형 아바타.
 *
 * `size` 는 **더할 수만 있는 선택 인자**다. 기본 36 은 지금까지의 값 그대로이고,
 * 식당 상담 시트만 40 을 준다(시안 실측). 크기를 소비처가 정하게 두는 이유는
 * 아바타 이미지 자산이 하나뿐이기 때문이다 — 표면마다 파일을 복제하면 다크 자산이
 * 갈리고, 그때 어느 쪽이 정본인지 아무도 모른다.
 */
export function AssistantAvatar({ size = 36 }: { size?: number } = {}) {
  const colorScheme = useAppColorScheme()
  const isDarkMode = colorScheme === "dark"

  return (
    <V2Box
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        marginTop: 4,
      }}
    >
      <Image
        source={isDarkMode ? AVATAR_DARK : AVATAR_LIGHT}
        style={{ width: size, height: size }}
        contentFit="contain"
        transition={0}
      />
    </V2Box>
  )
}

export { useChatTranscript as useSmoothStreamingText } from "../hooks/useChatTranscript"

/**
 * 말풍선은 memo 합니다. 부모(consult 화면)는 입력창 타이핑·isTyping 토글마다
 * 리렌더되는데, memo 가 없으면 그때마다 모든 메시지의 Markdown 이 다시 파싱됩니다.
 * 대화가 길수록 입력 자체가 느려집니다.
 */

/**
 * 사용자 메시지만 버블을 갖는다 — 라이트에선 잉크색 면에 흰 글자,
 * 다크에선 밝은 면에 잉크 글자. 꼬리·시각·아바타 없이 면 하나.
 */
export const UserBubble = memo(function UserBubble({
  message,
}: {
  message: Message
}) {
  const scheme = useAppColorScheme() === "dark" ? "dark" : "light"
  const { t } = useTranslation()
  /*
    빌더가 만든 원문이면 텍스트 덩어리 대신 구조화된 카드로 보여준다. 서버에는 텍스트만
    저장되므로 **히스토리 재로드도 이 파싱을 그대로 탄다** — 상담 기록에서 다시 연 대화가
    곧 이 경로다.

    세 파서(식당·식사·검진)의 **순서와 판정 근거는 여기 있지 않다.** 셋이 서로의 원문을
    통과시키는 방식이 비대칭이라(식당 원문이 식사 파서에 걸리고, 식당 파서는 식사·검진
    원문을 전부 통과시킨다) 순서를 화면마다 적으면 표면이 늘 때마다 같은 함정을 다시 밟는다.
    `resolveConsultUserCard` 가 그 정본이고, 근거는 그 파일 머리말에 있다.
  */
  const consult = useMemo(
    () =>
      resolveConsultUserCard({
        stats: () => parseStatsConsultMessage(message.content),
        restaurant: () => parseRestaurantConsultMessage(message.content),
        food: () => parseFoodConsultMessage(message.content),
        exam: () =>
          parseExamConsultMessage(message.content, (key, options) =>
            String(t(key as never, options as never)),
          ),
      }),
    [message.content, t],
  )
  const consultCard =
    consult?.kind === "food" ||
    consult?.kind === "exam" ||
    consult?.kind === "stats"
  /*
    식당 시트는 질문 뒤에 `[식당]`/`[분류]`/`[메뉴]` 블록을 매달아 보낸다. 그 원문을 그대로
    그리면 버블에 메뉴 영양소 숫자가 통째로 뜬다 — 시트의 `ConsultUserBubble` 과 같은 계약으로
    **질문 한 줄만** 남긴다. 파싱이 안 되면 원문이 곧 질문이다(안전한 실패).
  */
  const bubbleText =
    consult?.kind === "restaurant" ? consult.question : message.content
  return (
    <V2HStack justify="flex-end" paddingHorizontal={CHAT_GUTTER}>
      <V2VStack
        align="flex-end"
        gap={6}
        style={{
          width: consultCard ? "88%" : undefined,
          maxWidth: consultCard ? "88%" : "78%",
        }}
      >
        {/* 첨부 사진은 버블 밖 독립 썸네일 — 요즘 LLM 챗 문법 그대로. */}
        {message.imageUri && (
          <Image
            source={remoteImageSource(message.imageUri)}
            style={{ width: 180, height: 180, borderRadius: 18 }}
            contentFit="cover"
            transition={120}
            accessibilityLabel={t("consult.attachedPhoto")}
          />
        )}
        {consult?.kind === "stats" ? (
          <StatsConsultCard data={consult.data} />
        ) : consult?.kind === "food" ? (
          <FoodConsultCard data={consult.data} />
        ) : consult?.kind === "exam" ? (
          <ExamConsultCard data={consult.data} />
        ) : (
          bubbleText.length > 0 && (
            <V2VStack
              paddingHorizontal={16}
              paddingVertical={10}
              style={{
                backgroundColor: USER_BUBBLE_BG[scheme],
                borderRadius: 20,
              }}
            >
              <V2Text
                color={USER_BUBBLE_TEXT[scheme]}
                lineBreakStrategyIOS="hangul-word"
                textBreakStrategy="balanced"
                style={{ fontSize: 15, lineHeight: 22, letterSpacing: -0.2 }}
              >
                {bubbleText}
              </V2Text>
            </V2VStack>
          )
        )}
      </V2VStack>
    </V2HStack>
  )
})

export const AssistantBubble = memo(function AssistantBubble({
  message,
  isLastAssistant = false,
  isStreaming = false,
  actionsDisabled = false,
  onCopy,
  onRegenerate,
  onDisclosure,
}: {
  message: Message
  /**
   * 재생성은 마지막 질문을 다시 보내는 동작이다 — 지난 답변 밑에 버튼을 두면
   * 엉뚱한 턴이 다시 생성되고, 누른 답변은 그대로 남는다. 그래서 마지막 답변에만 둔다.
   */
  isLastAssistant?: boolean
  isStreaming?: boolean
  actionsDisabled?: boolean
  // 내용은 컴포넌트가 알고 있으므로 인자로 넘깁니다. 호출처가
  // onCopy={() => handleCopy(msg.content)} 로 감싸면 매 렌더 새 함수가 되어 memo 가 무력화됩니다.
  onCopy?: (content: string) => void
  onRegenerate?: () => void
  onDisclosure?: () => void
}) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()
  const iconColor = colors.label.neutral
  const mdStyles = useMemo(
    () =>
      makeMarkdownStyles({
        text: colors.label.normal,
        muted: colors.label.neutral,
        surface: colors.fill.alternative,
        divider: colors.line.normal,
        codeBg: colors.fill.normal,
        link: colors.primary.primary,
      }),
    [colors],
  )
  const displayedContent = useSmoothStreamingText(message.content, isStreaming)
  const markdownContent = normalizeAssistantMarkdown(displayedContent)
  const hasResultCards = message.activities?.some(
    (item) =>
      item.status === "complete" && (item.nutrition || item.sources?.length),
  )
  const result = useConsultResultReveal(
    isStreaming,
    message.deliveryState === "failed",
    hasResultCards ? onDisclosure : undefined,
  )
  const reduceMotion = useReducedMotion()
  const hasActions =
    !isStreaming &&
    !actionsDisabled &&
    (result.ready || message.deliveryState === "failed")
  const canRetry = isLastAssistant && message.failureRetryable !== false

  return (
    <V2VStack paddingHorizontal={CHAT_GUTTER} gap={10}>
      <ConsultActivityTrail
        activities={message.activities}
        active={isStreaming}
        answerStarted={displayedContent.length > 0}
        deliveryState={message.deliveryState}
        onDisclosure={onDisclosure}
      />
      {markdownContent.length > 0 && (
        <Markdown
          markdownit={markdownItInstance}
          rules={markdownRules}
          style={mdStyles}
        >
          {markdownContent}
        </Markdown>
      )}
      {result.ready && hasResultCards && (
        <Animated.View
          entering={
            result.animate && !reduceMotion ? FadeIn.duration(200) : undefined
          }
        >
          <ConsultDataCards
            activities={message.activities}
            onDisclosure={onDisclosure}
          />
        </Animated.View>
      )}
      {/* 액션은 답변이 다 드러난 뒤에만 — 쓰는 중에 아이콘이 밀려다니지 않게. */}
      <V2HStack gap={12} style={{ minHeight: 44 }}>
        {hasActions && (
          <>
            {message.content.length > 0 &&
              message.deliveryState !== "failed" && (
                <Pressable
                  style={{
                    minHeight: 44,
                    minWidth: 44,
                    justifyContent: "center",
                  }}
                  onPress={() => onCopy?.(consultCopyText(message, t))}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("consult.copyAnswer")}
                >
                  <Icon name="copy" size={18} color={iconColor} />
                </Pressable>
              )}
            {canRetry && (
              <Pressable
                onPress={onRegenerate}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("consult.regenerate")}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.55 : 1,
                  minHeight: 44,
                  justifyContent: "center",
                })}
              >
                <V2HStack align="center" gap={5}>
                  <Icon name="reset" size={18} color={iconColor} />
                  <V2Text
                    color={iconColor}
                    lineBreakStrategyIOS="hangul-word"
                    style={{ fontSize: 12, fontWeight: "600", lineHeight: 18 }}
                  >
                    {t("consult.regenerate")}
                  </V2Text>
                </V2HStack>
              </Pressable>
            )}
          </>
        )}
      </V2HStack>
    </V2VStack>
  )
})
