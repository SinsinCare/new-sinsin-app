import { Pressable, StyleSheet } from "react-native"
import Markdown from "react-native-markdown-display"
import { Image } from "expo-image"
import { YStack, Text, XStack, View } from "tamagui"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Icon } from "@/src/shared/components/Icon"
import type { Message } from "@/src/types/chat"

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function AssistantAvatar() {
  const colorScheme = useColorScheme()
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
        source={
          isDarkMode
            ? require("@/assets/images/Sin_dark.png")
            : require("@/assets/images/Sin_light.png")
        }
        style={{ width: 36, height: 36 }}
        contentFit="cover"
      />
    </View>
  )
}

const markdownStylesLight = StyleSheet.create({
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: "#2A2A37",
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
    color: "#E7E7EE",
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

export function UserBubble({ message }: { message: Message }) {
  const colorScheme = useColorScheme()
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
        backgroundColor={isDarkMode ? "#2E2E34" : "#FDFDFD"}
        borderRadius="$6"
        borderBottomRightRadius="1"
        paddingHorizontal="$3"
        paddingVertical="$2.5"
        maxWidth="70%"
      >
        <Text
          fontSize="$4"
          color={isDarkMode ? "#E7E7EE" : "#2A2A37"}
          lineHeight={22}
        >
          {message.content}
        </Text>
      </YStack>
    </XStack>
  )
}

export function AssistantBubble({
  message,
  // isLastAssistant,
  onCopy,
  onRegenerate,
}: {
  message: Message
  isLastAssistant?: boolean
  onCopy?: () => void
  onRegenerate?: () => void
}) {
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"
  const iconColor = isDarkMode ? "#66666B" : "#A5A5AF"

  return (
    <XStack paddingHorizontal="$4" gap="$2.5" alignItems="flex-start">
      <AssistantAvatar />
      <YStack flex={1} gap="$2">
        <Markdown style={isDarkMode ? markdownStylesDark : markdownStylesLight}>
          {message.content}
        </Markdown>
        {/* {isLastAssistant && ( */}
        <XStack gap="$3">
          <Pressable onPress={onCopy} hitSlop={8}>
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
}
