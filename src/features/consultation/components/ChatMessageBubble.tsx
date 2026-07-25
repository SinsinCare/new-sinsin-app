import { memo } from "react"
import { Pressable, StyleSheet } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import Markdown from "react-native-markdown-display"
import { YStack, Text, XStack, View } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"
import { tokens } from "@/src/theme/tokens"
import type { Message } from "@/src/types/chat"
import { Image } from "expo-image"

// 아바타는 메시지마다 렌더됩니다. SVG 래퍼(base64 PNG 645KB)를 그대로 두면
// 말풍선 하나당 그 컴포넌트를 인스턴스화하게 되어 상담 탭 스크롤이 무너집니다.
const AVATAR_DARK = require("@/assets/images/Sin_dark.png")
const AVATAR_LIGHT = require("@/assets/images/Sin_light.png")

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
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

const markdownStylesLight = StyleSheet.create({
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: tokens.color.textLight.val,
    fontFamily: "Pretendard-Regular",
  },
  strong: {
    fontFamily: "Pretendard-Bold",
    fontWeight: "700",
  },
  em: {
    fontStyle: "italic",
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  list_item: {
    marginVertical: 2,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 6,
  },
})

const markdownStylesDark = StyleSheet.create({
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: tokens.color.textDark.val,
    fontFamily: "Pretendard-Regular",
  },
  strong: {
    fontFamily: "Pretendard-Bold",
    fontWeight: "700",
  },
  em: {
    fontStyle: "italic",
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  list_item: {
    marginVertical: 2,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 6,
  },
})

/**
 * 말풍선은 memo 합니다. 부모(consult 화면)는 입력창 타이핑·isTyping 토글마다
 * 리렌더되는데, memo 가 없으면 그때마다 모든 메시지의 Markdown 이 다시 파싱됩니다.
 * 대화가 길수록 입력 자체가 느려집니다.
 */
export const UserBubble = memo(function UserBubble({
  message,
}: {
  message: Message
}) {
  const colorScheme = useAppColorScheme()
  const isDarkMode = colorScheme === "dark"
  return (
    <XStack
      justifyContent="flex-end"
      alignItems="flex-end"
      paddingHorizontal="$4"
      gap="$1.5"
    >
      <Text fontSize={11} color="$grey6">
        {formatTime(message.createdAt)}
      </Text>
      <YStack
        backgroundColor={
          isDarkMode ? tokens.color.inputBgDark.val : tokens.color.offWhite.val
        }
        borderRadius="$6"
        borderBottomRightRadius={1}
        paddingHorizontal="$3"
        paddingVertical="$2.5"
        maxWidth="70%"
      >
        <Text
          fontSize="$4"
          color={
            isDarkMode ? tokens.color.textDark.val : tokens.color.textLight.val
          }
          lineHeight={22}
        >
          {message.content}
        </Text>
      </YStack>
    </XStack>
  )
})

export const AssistantBubble = memo(function AssistantBubble({
  message,
  // isLastAssistant,
  onCopy,
  onRegenerate,
}: {
  message: Message
  isLastAssistant?: boolean
  // 내용은 컴포넌트가 알고 있으므로 인자로 넘깁니다. 호출처가
  // onCopy={() => handleCopy(msg.content)} 로 감싸면 매 렌더 새 함수가 되어 memo 가 무력화됩니다.
  onCopy?: (content: string) => void
  onRegenerate?: () => void
}) {
  const colorScheme = useAppColorScheme()
  const isDarkMode = colorScheme === "dark"
  const iconColor = isDarkMode ? "#66666B" : tokens.color.textLightSub.val

  return (
    <XStack paddingHorizontal="$4" gap="$2.5" alignItems="flex-start">
      <AssistantAvatar />
      <YStack flex={1} gap="$2">
        <Markdown style={isDarkMode ? markdownStylesDark : markdownStylesLight}>
          {message.content}
        </Markdown>
        {/* {isLastAssistant && ( */}
        <XStack gap="$3">
          <Pressable onPress={() => onCopy?.(message.content)} hitSlop={8}>
            <Icon name="copy" size={20} color={iconColor} />
          </Pressable>
          <Pressable onPress={onRegenerate} hitSlop={8}>
            <Icon name="reset" size={20} color={iconColor} />
          </Pressable>
        </XStack>
        {/* )} */}
      </YStack>
    </XStack>
  )
})
