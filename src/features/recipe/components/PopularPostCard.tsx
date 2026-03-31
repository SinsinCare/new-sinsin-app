import { Alert, Pressable, useColorScheme } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"

interface PopularPostCardProps {
  category: string
  title: string
  summary: string
  authorName: string
  viewCount: number
  likeCount: number
  commentCount: number
  onPress?: () => void
  onBlock?: (authorName: string) => void
}

const CARD_COLORS = {
  light: {
    background: "#FDFDFD",
    category: "#44AF94",
    title: "#2A2A37",
    summary: "#474758",
    meta: "#8E8E93",
    iconColor: "#E78A63D9",
    iconTextColor: "#474758",
  },
  dark: {
    background: "#36363E",
    category: "#5BC5AB",
    title: "#E7E7EE",
    summary: "#ABABB4",
    meta: "#858591",
    iconTextColor: "#ABABB4",
    iconColor: "#E78A63D9",
  },
} as const

export function PopularPostCard({
  category,
  title,
  summary,
  authorName,
  viewCount,
  likeCount,
  commentCount,
  onPress,
  onBlock,
}: PopularPostCardProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const colors = isDark ? CARD_COLORS.dark : CARD_COLORS.light

  const handleMorePress = () => {
    Alert.alert(authorName, undefined, [
      {
        text: "이 사용자 차단하기",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "사용자 차단",
            `${authorName}님을 차단하면 이 사용자의 게시글이 피드에서 즉시 제거됩니다.`,
            [
              { text: "취소", style: "cancel" },
              {
                text: "차단하기",
                style: "destructive",
                onPress: () => onBlock?.(authorName),
              },
            ],
          )
        },
      },
      { text: "취소", style: "cancel" },
    ])
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <YStack
        width={280}
        backgroundColor={colors.background}
        borderRadius={12}
        padding={16}
        gap={8}
      >
        <XStack alignItems="center" justifyContent="space-between">
          <Text
            fontSize={13}
            fontWeight="600"
            fontFamily="$body"
            color={colors.category}
          >
            {category}
          </Text>
          <Pressable
            onPress={handleMorePress}
            hitSlop={8}
            accessibilityLabel="더보기"
          >
            <Icon name="ellipsis-horizontal" size={16} color={colors.meta} />
          </Pressable>
        </XStack>

        <Text
          fontSize={15}
          fontWeight="700"
          fontFamily="$body"
          color={colors.title}
          numberOfLines={2}
        >
          {title}
        </Text>

        <Text
          fontSize={13}
          fontWeight="400"
          fontFamily="$body"
          color={colors.summary}
          numberOfLines={2}
        >
          {summary}
        </Text>

        <XStack
          alignItems="center"
          justifyContent="space-between"
          marginTop={4}
        >
          <Text
            fontSize={12}
            fontWeight="400"
            fontFamily="$body"
            color={colors.meta}
          >
            조회 {viewCount}
          </Text>
          <XStack alignItems="center" gap={12}>
            <XStack alignItems="center" gap={4}>
              <Icon name="hands-clap" size={16} color={colors.iconColor} />
              <Text
                fontSize={12}
                fontWeight="400"
                fontFamily="$body"
                color={colors.iconTextColor}
              >
                {likeCount}
              </Text>
            </XStack>
            <XStack alignItems="center" gap={4}>
              <Icon name="message" size={16} color={colors.iconColor} />
              <Text
                fontSize={12}
                fontWeight="400"
                fontFamily="$body"
                color={colors.iconTextColor}
              >
                {commentCount}
              </Text>
            </XStack>
          </XStack>
        </XStack>
      </YStack>
    </Pressable>
  )
}
