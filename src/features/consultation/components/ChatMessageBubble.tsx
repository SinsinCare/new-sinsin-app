import { memo, useEffect, useMemo, useRef, useState } from "react"
import { Pressable, StyleSheet, Text as RNText } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import Markdown, {
  MarkdownIt,
  type RenderRules,
} from "react-native-markdown-display"
import markdownItCjkFriendly from "markdown-it-cjk-friendly"
import { YStack, Text, XStack, View } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"
import { tokens } from "@/src/theme/tokens"
import type { Message } from "@/src/types/chat"
import { Image } from "expo-image"
import { useTranslation } from "react-i18next"

import { parseFoodConsultMessage } from "../utils/foodConsultMessage"
import { FoodConsultCard } from "./FoodConsultCard"
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
 */
const markdownItInstance = MarkdownIt({ typographer: true }).use(
  markdownItCjkFriendly,
)

interface MarkdownPalette {
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
 */
function makeMarkdownStyles(palette: MarkdownPalette) {
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
const markdownRules: RenderRules = {
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

export function AssistantAvatar() {
  const colorScheme = useAppColorScheme()
  const isDarkMode = colorScheme === "dark"

  return (
    <View
      width={36}
      height={36}
      borderRadius={18}
      overflow="hidden"
      marginTop="$1"
    >
      <Image
        source={isDarkMode ? AVATAR_DARK : AVATAR_LIGHT}
        style={{ width: 36, height: 36 }}
        contentFit="contain"
        transition={0}
      />
    </View>
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
 */
function useSmoothStreamingText(content: string): string {
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
  // 식이리포트 "물어보기" 원문이면 텍스트 덩어리 대신 구조화된 카드로 보여준다.
  // 서버에는 텍스트만 저장되므로 히스토리 재로드도 이 파싱을 그대로 탄다.
  const foodConsult = useMemo(
    () => parseFoodConsultMessage(message.content),
    [message.content],
  )
  return (
    <XStack justifyContent="flex-end" paddingHorizontal={CHAT_GUTTER}>
      <YStack
        alignItems="flex-end"
        gap={6}
        // 영양소 2열 그리드가 숨 쉴 폭 — 카드일 때만 살짝 넓힌다.
        width={foodConsult ? "88%" : undefined}
        maxWidth={foodConsult ? "88%" : "78%"}
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
        {foodConsult ? (
          <FoodConsultCard data={foodConsult} />
        ) : (
          message.content.length > 0 && (
            <YStack
              backgroundColor={USER_BUBBLE_BG[scheme]}
              borderRadius={20}
              paddingHorizontal={16}
              paddingVertical={10}
            >
              <Text
                fontSize={15}
                lineHeight={22}
                letterSpacing={-0.2}
                color={USER_BUBBLE_TEXT[scheme]}
                lineBreakStrategyIOS="hangul-word"
                textBreakStrategy="balanced"
              >
                {message.content}
              </Text>
            </YStack>
          )
        )}
      </YStack>
    </XStack>
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
    <YStack paddingHorizontal={CHAT_GUTTER} gap="$2.5">
      <Markdown
        markdownit={markdownItInstance}
        rules={markdownRules}
        style={isDarkMode ? markdownStylesDark : markdownStylesLight}
      >
        {displayedContent}
      </Markdown>
      {/* 액션은 답변이 다 드러난 뒤에만 — 쓰는 중에 아이콘이 밀려다니지 않게. */}
      {!isRevealing && (
        <XStack gap="$3">
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
              <XStack alignItems="center" gap={5}>
                <Icon name="reset" size={18} color={iconColor} />
                <Text
                  fontSize={12}
                  fontWeight="600"
                  color={iconColor}
                  lineHeight={18}
                >
                  {t("consult.regenerate")}
                </Text>
              </XStack>
            </Pressable>
          )}
        </XStack>
      )}
    </YStack>
  )
})
