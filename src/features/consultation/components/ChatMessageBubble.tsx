import { memo, useEffect, useMemo, useRef, useState } from "react"
import { Pressable, StyleSheet, Text as RNText } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import Markdown, {
  MarkdownIt,
  type RenderRules,
} from "react-native-markdown-display"
import markdownItCjkFriendly from "markdown-it-cjk-friendly"
import { V2Box, V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import { Icon } from "@/src/shared/components/Icon"
import { tokens } from "@/src/theme/tokens"
import type { Message } from "@/src/types/chat"
import { Image } from "expo-image"
import { useTranslation } from "react-i18next"

import { parseRestaurantConsultMessage } from "@/src/features/restaurant/consult/restaurantConsultMessage"
import { parseFoodConsultMessage } from "../utils/foodConsultMessage"
import { parseExamConsultMessage } from "../utils/examConsultMessage"
import { resolveConsultUserCard } from "../utils/consultUserMessage"
import { FoodConsultCard } from "./FoodConsultCard"
import { ExamConsultCard } from "./ExamConsultCard"
import { USER_BUBBLE_BG, USER_BUBBLE_TEXT } from "./chatPalette"

// 아바타는 메시지마다 렌더됩니다. SVG 래퍼(base64 PNG 645KB)를 그대로 두면
// 말풍선 하나당 그 컴포넌트를 인스턴스화하게 되어 상담 탭 스크롤이 무너집니다.
const AVATAR_DARK = require("@/assets/images/Sin_dark.png")
const AVATAR_LIGHT = require("@/assets/images/Sin_light.png")

/** 채팅 본문 거터. 컴포저·화면 그리드(20)와 같은 선에 선다. */
export const CHAT_GUTTER = 20

/**
 * 한국어 문장은 `**강조**입니다`처럼 닫는 별표 뒤에 조사가 바로 붙는데,
 * CommonMark 의 플랭킹 규칙이 이를 강조 종료로 인정하지 않아 `**`가
 * 리터럴로 노출된다. cjk-friendly 플러그인이 그 규칙을 CJK 기준으로 고친다.
 *
 * ## 왜 export 인가 — 이 파일이 앱의 **답변 렌더 정본**이다
 *
 * 식당 상세의 `AI 식단 상담` 시트도 같은 스트림을 그린다. 거기서 MarkdownIt 를 새로
 * 만들면 cjk-friendly 를 빠뜨린 판이 하나 더 생기고, 그때 별표가 리터럴로 새는 화면은
 * **상담 화면이 아니라 시트 쪽**이라 여기 테스트로는 안 잡힌다. 인스턴스를 나눠 쓰면
 * 그 갈래가 애초에 생기지 않는다(파서 인스턴스는 상태가 없어 공유해도 안전하다).
 */
export const markdownItInstance = MarkdownIt({ typographer: true }).use(
  markdownItCjkFriendly,
)

/** 마크다운 본문이 쓰는 6색. 소비처가 자기 면에 맞는 한 벌을 떠서 넘긴다. */
export interface MarkdownPalette {
  text: string
  muted: string
  surface: string
  divider: string
  codeBg: string
  link: string
}

const MARKDOWN_PALETTE: Record<"light" | "dark", MarkdownPalette> = {
  light: {
    text: tokens.color.textLight.val,
    muted: "#747678",
    surface: "#F5F6F8",
    divider: "#E9EAEC",
    codeBg: "#F2F3F5",
    link: "#0D896A",
  },
  dark: {
    text: tokens.color.textDark.val,
    muted: "#A5A7A9",
    surface: "#2A2B2F",
    divider: "#3A3B40",
    codeBg: "#2C2D31",
    link: "#5BC5AB",
  },
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
      height: StyleSheet.hairlineWidth,
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
      borderWidth: StyleSheet.hairlineWidth,
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
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: palette.divider,
      flexDirection: "row",
    },
    td: { paddingHorizontal: 10, paddingVertical: 8 },
  })
}

const markdownStylesLight = makeMarkdownStyles(MARKDOWN_PALETTE.light)
const markdownStylesDark = makeMarkdownStyles(MARKDOWN_PALETTE.dark)

// 한국어가 단어 중간에서 꺾이지 않게 본문 텍스트 그룹에 어절 줄바꿈을 건다.
// 답변을 그리는 다른 표면(식당 상담 시트)도 같은 규칙을 써야 줄바꿈이 갈리지 않는다.
export const markdownRules: RenderRules = {
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

const REVEAL_TICK_MS = 48
/** 밀린 글자의 이 비율만큼씩 드러낸다 — 백로그가 줄수록 저절로 감속(이즈아웃). */
const REVEAL_RATIO = 0.14
const REVEAL_MIN_STEP = 2

/**
 * SSE 청크는 네트워크 사정대로 몰려 들어와 그대로 그리면 따다닥 끊긴다.
 * 도착분을 버퍼로 받고 일정한 틱으로 흘려보내면 이어 쓰듯 매끄럽게 보인다.
 * 히스토리 로드처럼 처음부터 완성된 내용은 그대로 보여준다(초기값).
 *
 * 식당 상담 시트도 같은 스트림을 받는다 — 드러내기 속도가 표면마다 다르면 같은
 * 답변이 화면에 따라 다른 속도로 써지는데, 그건 사용자가 설명할 수 없는 차이다.
 */
export function useSmoothStreamingText(content: string): string {
  const [displayed, setDisplayed] = useState(content)
  const displayedRef = useRef(content)
  const targetRef = useRef(content)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    targetRef.current = content

    // 이어 쓰기가 아니라 내용 교체(재생성·에러 치환)면 즉시 반영한다.
    if (!content.startsWith(displayedRef.current)) {
      displayedRef.current = content
      setDisplayed(content)
      return
    }
    if (timerRef.current || displayedRef.current === content) return

    timerRef.current = setInterval(() => {
      const target = targetRef.current
      const current = displayedRef.current
      if (current.length >= target.length) {
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = null
        return
      }
      const backlog = target.length - current.length
      const step = Math.max(REVEAL_MIN_STEP, Math.round(backlog * REVEAL_RATIO))
      const next = target.slice(0, current.length + step)
      displayedRef.current = next
      setDisplayed(next)
    }, REVEAL_TICK_MS)
  }, [content])

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current)
    },
    [],
  )

  return displayed
}

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
        restaurant: () => parseRestaurantConsultMessage(message.content),
        food: () => parseFoodConsultMessage(message.content),
        exam: () =>
          parseExamConsultMessage(message.content, (key, options) =>
            String(t(key as never, options as never)),
          ),
      }),
    [message.content, t],
  )
  const consultCard = consult?.kind === "food" || consult?.kind === "exam"
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
            source={{ uri: message.imageUri }}
            style={{ width: 180, height: 180, borderRadius: 18 }}
            contentFit="cover"
            transition={120}
            accessibilityLabel={t("consult.attachedPhoto")}
          />
        )}
        {consult?.kind === "food" ? (
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
  onCopy,
  onRegenerate,
}: {
  message: Message
  /**
   * 재생성은 마지막 질문을 다시 보내는 동작이다 — 지난 답변 밑에 버튼을 두면
   * 엉뚱한 턴이 다시 생성되고, 누른 답변은 그대로 남는다. 그래서 마지막 답변에만 둔다.
   */
  isLastAssistant?: boolean
  // 내용은 컴포넌트가 알고 있으므로 인자로 넘깁니다. 호출처가
  // onCopy={() => handleCopy(msg.content)} 로 감싸면 매 렌더 새 함수가 되어 memo 가 무력화됩니다.
  onCopy?: (content: string) => void
  onRegenerate?: () => void
}) {
  const { t } = useTranslation()
  const colorScheme = useAppColorScheme()
  const isDarkMode = colorScheme === "dark"
  const iconColor = isDarkMode ? "#66666B" : tokens.color.textLightSub.val
  const displayedContent = useSmoothStreamingText(message.content)
  const isRevealing = displayedContent !== message.content

  // AI 답변은 버블도 아바타도 없다 — 전폭 본문과 여백이 곧 위계다.
  // 오른쪽의 컴팩트한 사용자 버블과 대비되어 화자가 저절로 구분된다.
  return (
    <V2VStack paddingHorizontal={CHAT_GUTTER} gap={10}>
      <Markdown
        markdownit={markdownItInstance}
        rules={markdownRules}
        style={isDarkMode ? markdownStylesDark : markdownStylesLight}
      >
        {displayedContent}
      </Markdown>
      {/* 액션은 답변이 다 드러난 뒤에만 — 쓰는 중에 아이콘이 밀려다니지 않게. */}
      {!isRevealing && (
        <V2HStack gap={12}>
          <Pressable
            onPress={() => onCopy?.(message.content)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("consult.copyAnswer")}
          >
            <Icon name="copy" size={18} color={iconColor} />
          </Pressable>
          {isLastAssistant && (
            <Pressable
              onPress={onRegenerate}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("consult.regenerate")}
              style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
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
        </V2HStack>
      )}
    </V2VStack>
  )
})
