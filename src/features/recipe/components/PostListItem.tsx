import { Pressable, useColorScheme } from "react-native"
import { YStack, XStack, Text, View } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"

interface PostListItemProps {
  title: string
  summary: string
  viewCount: number
  likeCount: number
  commentCount: number
  onPress?: () => void
  showDivider?: boolean
}

const ITEM_COLORS = {
  light: {
    title: "#2A2A37",
    summary: "#666677",
    meta: "#8E8E93",
    iconColor: "#E78A63D9",
    iconTextColor: "#2A2A37",
    divider: "#CACBD5",
  },
  dark: {
    title: "#E7E7EE",
    summary: "#858591",
    meta: "#858591",
    iconColor: "#E78A63D9",
    iconTextColor: "#E7E7EE",
    divider: "#4E4F55",
  },
} as const

export function PostListItem({
  title,
  summary,
  viewCount,
  likeCount,
  commentCount,
  onPress,
  showDivider = true,
}: PostListItemProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const colors = isDark ? ITEM_COLORS.dark : ITEM_COLORS.light

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <YStack paddingVertical={16} gap={8}>
        <Text
          fontSize={16}
          fontWeight="700"
          fontFamily="$body"
          color={colors.title}
          numberOfLines={1}
        >
          {title}
        </Text>

        <Text
          fontSize={14}
          fontWeight="400"
          fontFamily="$body"
          color={colors.summary}
          numberOfLines={3}
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

      {showDivider && <View height={1} backgroundColor={colors.divider} />}
    </Pressable>
  )
}
