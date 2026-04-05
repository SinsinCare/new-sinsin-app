import { Alert, Pressable, useColorScheme } from "react-native"
import { YStack, XStack, Text, View } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"
import { tokens } from "@/src/theme/tokens"
import { reportService } from "@/src/services/reportService"
import type { ReportReason } from "@/src/services/reportService"

interface PostListItemProps {
  title: string
  summary: string
  authorName: string
  viewCount: number
  likeCount: number
  commentCount: number
  onPress?: () => void
  onBlock?: (authorName: string) => void
  showDivider?: boolean
}

const ITEM_COLORS = {
  light: {
    title: tokens.color.textLight.val,
    summary: "#666677",
    meta: "#8E8E93",
    iconColor: "#E78A63D9",
    iconTextColor: tokens.color.textLight.val,
    divider: "#CACBD5",
  },
  dark: {
    title: tokens.color.textDark.val,
    summary: "#858591",
    meta: "#858591",
    iconColor: "#E78A63D9",
    iconTextColor: tokens.color.textDark.val,
    divider: "#4E4F55",
  },
} as const

export function PostListItem({
  title,
  summary,
  authorName,
  viewCount,
  likeCount,
  commentCount,
  onPress,
  onBlock,
  showDivider = true,
}: PostListItemProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const colors = isDark ? ITEM_COLORS.dark : ITEM_COLORS.light

  const handleReport = () => {
    const reasons: { label: string; value: ReportReason }[] = [
      { label: "스팸/광고", value: "SPAM" },
      { label: "괴롭힘/혐오 표현", value: "HARASSMENT" },
      { label: "부적절한 콘텐츠", value: "INAPPROPRIATE_CONTENT" },
      { label: "거짓 정보", value: "FALSE_INFORMATION" },
      { label: "기타", value: "OTHER" },
    ]
    Alert.alert("신고 사유를 선택해주세요", undefined, [
      ...reasons.map((r) => ({
        text: r.label,
        onPress: () => {
          reportService.reportUser({
            targetNickName: authorName,
            reason: r.value,
          })
          Alert.alert("신고 완료", "신고가 접수되었습니다. 검토 후 조치하겠습니다.")
        },
      })),
      { text: "취소", style: "cancel" as const },
    ])
  }

  const handleMorePress = () => {
    Alert.alert(authorName, undefined, [
      {
        text: "이 게시글 신고하기",
        onPress: handleReport,
      },
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
      <YStack paddingVertical={16} gap={8}>
        <XStack alignItems="flex-start" justifyContent="space-between">
          <Text
            flex={1}
            fontSize={16}
            fontWeight="700"
            fontFamily="$body"
            color={colors.title}
            numberOfLines={1}
            paddingRight={8}
          >
            {title}
          </Text>
          <Pressable
            onPress={handleMorePress}
            hitSlop={8}
            accessibilityLabel="더보기"
          >
            <Icon name="ellipsis-horizontal" size={18} color={colors.meta} />
          </Pressable>
        </XStack>

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
