import { Pressable, useColorScheme } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"

interface PopularPostCardProps {
  category: string
  title: string
  summary: string
  viewCount: number
  likeCount: number
  commentCount: number
  onPress?: () => void
}

const CARD_COLORS = {
  light: {
    background: "#FDFDFD",
    category: "#44AF94",
    title: "#2A2A37",
    summary: "#474758",
    meta: "#666677",
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
  viewCount,
  likeCount,
  commentCount,
  onPress,
}: PopularPostCardProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const colors = isDark ? CARD_COLORS.dark : CARD_COLORS.light

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
        <Text
          fontSize={13}
          fontWeight="600"
          fontFamily="$body"
          color={colors.category}
        >
          {category}
        </Text>

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
