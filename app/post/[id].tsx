import {
  Pressable,
  ScrollView,
  useColorScheme,
  StyleSheet,
  ActionSheetIOS,
  Alert,
  Platform,
} from "react-native"
import { YStack, XStack, Text, View } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter, type Href } from "expo-router"
import { Icon } from "@/src/shared/components/Icon"
import { usePostDetail } from "@/src/features/recipe/hooks/usePostDetail"
import { useCommunityPosts } from "@/src/features/recipe/hooks/useCommunityPosts"
import { ErrorMessage, LoadingScreen } from "@/src/shared/components"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { tokens } from "@/src/theme/tokens"

const BG = { light: tokens.color.offWhite.val, dark: tokens.color.appBgDark.val }
const HEADER_ICON = { light: "#3C3C43", dark: tokens.color.textDark.val }
const AUTHOR_NAME = { light: tokens.color.textLight.val, dark: tokens.color.textDark.val }
const AUTHOR_SUB = { light: "#81818D", dark: "#858591" }
const TITLE_COLOR = { light: tokens.color.textLight.val, dark: tokens.color.textDark.val }
const BODY_COLOR = { light: "#3C3C43", dark: "#C5C8CE" }
const DIVIDER = { light: "#E5E5EA", dark: tokens.color.cardBgDark.val }
const LIKE_COLOR = { light: "#44AF94", dark: "#44AF94" }
const MUTED_TEXT = { light: "#81818D", dark: "#858591" }
const AVATAR_BG = { light: tokens.color.textDark.val, dark: "#3A3A3C" }
const NAV_LABEL = { light: tokens.color.textLightSub.val, dark: tokens.color.textLightMuted.val }
const NAV_TITLE = { light: tokens.color.textLight.val, dark: tokens.color.textDark.val }

function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "방금 전"
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}시간 전`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay}일 전`
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const scheme = useColorScheme() ?? "light"

  const { post, isLoading, isError, error, refetch } = usePostDetail(id!)
  const { posts, toggleLike, toggleBookmark, deletePost, reportPost } =
    useCommunityPosts()

  const handleEdit = () => {
    if (!post) return
    const href = `/free/${post.id}` as Href
    router.push(href)
  }

  const handleDelete = () => {
    Alert.alert("게시글 삭제", "이 게시글을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          deletePost(post!.id)
          router.back()
        },
      },
    ])
  }

  const handleReport = () => {
    const reasons: { label: string; value: string }[] = [
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
          reportPost({ postId: post!.id, reason: r.value })
          Alert.alert(
            "신고 완료",
            "신고가 접수되었습니다. 검토 후 조치하겠습니다.",
          )
        },
      })),
      { text: "취소", style: "cancel" },
    ])
  }

  const handleMorePress = () => {
    const options = ["수정하기", "삭제하기", "신고하기", "취소"]
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 3, destructiveButtonIndex: 1 },
        (buttonIndex) => {
          if (buttonIndex === 0) handleEdit()
          else if (buttonIndex === 1) handleDelete()
          else if (buttonIndex === 2) handleReport()
        },
      )
    } else {
      Alert.alert("더보기", "", [
        { text: "수정하기", onPress: handleEdit },
        { text: "삭제하기", style: "destructive", onPress: handleDelete },
        { text: "신고하기", onPress: handleReport },
        { text: "취소", style: "cancel" },
      ])
    }
  }

  if (isError) {
    return (
      <YStack
        flex={1}
        backgroundColor={BG[scheme]}
        paddingTop={insets.top}
        paddingHorizontal={20}
        justifyContent="center"
      >
        <ErrorMessage
          message={getErrorMessage(error)}
          onRetry={() => refetch()}
        />
      </YStack>
    )
  }

  if (isLoading) {
    return <LoadingScreen message="게시물을 불러오는 중..." />
  }

  if (!post) {
    return (
      <YStack
        flex={1}
        backgroundColor={BG[scheme]}
        paddingTop={insets.top}
        paddingHorizontal={20}
        justifyContent="center"
        gap="$3"
      >
        <Text fontSize={16} fontFamily="$body" color={TITLE_COLOR[scheme]}>
          게시글을 찾을 수 없습니다.
        </Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text fontSize={15} color={LIKE_COLOR[scheme]} fontWeight="600">
            돌아가기
          </Text>
        </Pressable>
      </YStack>
    )
  }

  // Find previous/next posts
  const currentIndex = posts.findIndex((p) => p.id === post.id)
  const prevPost = currentIndex > 0 ? posts[currentIndex - 1] : null
  const nextPost =
    currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null

  return (
    <YStack flex={1} backgroundColor={BG[scheme]} paddingTop={insets.top}>
      {/* Header */}
      <XStack
        paddingHorizontal={16}
        paddingVertical={12}
        alignItems="center"
        justifyContent="space-between"
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Ionicons name="chevron-back" size={24} color={HEADER_ICON[scheme]} />
        </Pressable>
        <XStack gap={16} alignItems="center">
          {/* <Pressable hitSlop={8}>
            <Icon name="notification" size={24} color={HEADER_ICON[scheme]} />
          </Pressable> */}
          {/* <Pressable hitSlop={8}>
            <Icon name="upload" size={24} color={HEADER_ICON[scheme]} />
          </Pressable> */}
          <Pressable hitSlop={8} onPress={() => toggleBookmark(post.id)}>
            <Icon
              name="bookmark"
              size={24}
              color={post.bookmarked ? LIKE_COLOR[scheme] : HEADER_ICON[scheme]}
            />
          </Pressable>
          <Pressable hitSlop={8} onPress={handleMorePress}>
            <Ionicons
              name="ellipsis-horizontal"
              size={24}
              color={HEADER_ICON[scheme]}
            />
          </Pressable>
        </XStack>
      </XStack>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Author */}
        <XStack
          paddingHorizontal={20}
          paddingTop={16}
          gap={10}
          alignItems="center"
        >
          <View
            width={36}
            height={36}
            borderRadius={18}
            backgroundColor={AVATAR_BG[scheme]}
            alignItems="center"
            justifyContent="center"
          >
            <Ionicons name="person" size={18} color={MUTED_TEXT[scheme]} />
          </View>
          <YStack>
            <Text
              fontSize={15}
              fontWeight="600"
              fontFamily="$body"
              color={AUTHOR_NAME[scheme]}
            >
              {post.authorName}
            </Text>
            <Text
              fontSize={12}
              fontWeight="400"
              fontFamily="$body"
              color={AUTHOR_SUB[scheme]}
            >
              {formatTimeAgo(post.createdAt)}
            </Text>
          </YStack>
        </XStack>

        {/* Title */}
        <YStack paddingHorizontal={20} paddingTop={16}>
          <Text
            fontSize={18}
            fontWeight="700"
            fontFamily="$body"
            lineHeight={26}
            color={TITLE_COLOR[scheme]}
          >
            {post.title}
          </Text>
        </YStack>

        {/* Description */}
        <YStack paddingHorizontal={20} paddingTop={12} paddingBottom={20}>
          <Text
            fontSize={15}
            fontWeight="400"
            fontFamily="$body"
            lineHeight={24}
            color={BODY_COLOR[scheme]}
          >
            {post.description}
          </Text>
        </YStack>

        {/* Image */}
        {post.imageUri && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              gap: 8,
              paddingBottom: 20,
            }}
          >
            <View style={styles.thumbnail} backgroundColor={AVATAR_BG[scheme]}>
              <Ionicons name="image" size={24} color={MUTED_TEXT[scheme]} />
            </View>
          </ScrollView>
        )}

        {/* Engagement */}
        <XStack
          paddingHorizontal={20}
          paddingBottom={16}
          justifyContent="space-between"
          alignItems="center"
        >
          <Pressable
            onPress={() => toggleLike(post.id)}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <XStack gap={6} alignItems="center">
              <Ionicons
                name={post.liked ? "heart" : "heart-outline"}
                size={20}
                color={LIKE_COLOR[scheme]}
              />
              <Text
                fontSize={14}
                fontWeight="500"
                fontFamily="$body"
                color={LIKE_COLOR[scheme]}
              >
                좋아요
              </Text>
            </XStack>
          </Pressable>
          <Text
            fontSize={14}
            fontWeight="400"
            fontFamily="$body"
            color={MUTED_TEXT[scheme]}
          >
            조회 0
          </Text>
        </XStack>

        {/* Divider */}
        <View
          height={StyleSheet.hairlineWidth}
          backgroundColor={DIVIDER[scheme]}
        />

        {/* Previous / Next Post Navigation */}
        {prevPost && (
          <>
            <Pressable
              onPress={() => router.replace(`/post/${prevPost.id}`)}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <XStack
                paddingHorizontal={20}
                paddingVertical={16}
                gap={10}
                alignItems="center"
              >
                <Text
                  fontSize={13}
                  fontWeight="400"
                  fontFamily="$body"
                  color={NAV_LABEL[scheme]}
                >
                  이전
                </Text>
                <Text
                  fontSize={14}
                  fontWeight="400"
                  fontFamily="$body"
                  color={NAV_TITLE[scheme]}
                  numberOfLines={1}
                  flex={1}
                >
                  {prevPost.title}
                </Text>
              </XStack>
            </Pressable>
            <View
              height={StyleSheet.hairlineWidth}
              backgroundColor={DIVIDER[scheme]}
            />
          </>
        )}
        {nextPost && (
          <>
            <Pressable
              onPress={() => router.replace(`/post/${nextPost.id}`)}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <XStack
                paddingHorizontal={20}
                paddingVertical={16}
                gap={10}
                alignItems="center"
              >
                <Text
                  fontSize={13}
                  fontWeight="400"
                  fontFamily="$body"
                  color={NAV_LABEL[scheme]}
                >
                  다음
                </Text>
                <Text
                  fontSize={14}
                  fontWeight="400"
                  fontFamily="$body"
                  color={NAV_TITLE[scheme]}
                  numberOfLines={1}
                  flex={1}
                >
                  {nextPost.title}
                </Text>
              </XStack>
            </Pressable>
            <View
              height={StyleSheet.hairlineWidth}
              backgroundColor={DIVIDER[scheme]}
            />
          </>
        )}
      </ScrollView>
    </YStack>
  )
}

const styles = StyleSheet.create({
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
})
