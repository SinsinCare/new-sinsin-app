import { ScrollView, Pressable } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { SafeAreaView } from "react-native-safe-area-context"
import { Image } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { tokens } from "@/src/theme/tokens"
import { usePostDetail } from "@/src/features/recipe/hooks/usePostDetail"
import { useCommunityPosts } from "@/src/features/recipe/hooks/useCommunityPosts"
import { LoadingScreen } from "@/src/shared/components"

function formatTimeAgo(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}시간 전`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay}일 전`
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { post, isLoading } = usePostDetail(id!)
  const { toggleLike, toggleBookmark } = useCommunityPosts()

  if (isLoading || !post) {
    return <LoadingScreen message="게시물을 불러오는 중..." />
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      {/* Header */}
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        alignItems="center"
        gap="$3"
      >
        <Pressable onPress={() => router.back()}>
          <Ionicons
            name="chevron-back"
            size={24}
            color={tokens.color.grey1.val}
          />
        </Pressable>
        <Text fontSize="$5" fontWeight="700" color="$color" flex={1}>
          게시물
        </Text>
      </XStack>

      <YStack height={1} backgroundColor="$borderColor" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Author */}
        <XStack padding="$4" alignItems="center" gap="$3">
          <YStack
            width={44}
            height={44}
            borderRadius="$12"
            backgroundColor="$backgroundStrong"
            alignItems="center"
            justifyContent="center"
          >
            <Ionicons name="person" size={22} color={tokens.color.grey5.val} />
          </YStack>
          <YStack flex={1}>
            <Text fontSize="$5" fontWeight="600" color="$color">
              {post.authorName}
            </Text>
            <Text fontSize="$3" color="$colorSubtle">
              {post.authorRole} · {formatTimeAgo(post.createdAt)}
            </Text>
          </YStack>
        </XStack>

        {/* Image */}
        {post.imageUri && (
          <Image
            source={{ uri: post.imageUri }}
            style={{ width: "100%", height: 300 }}
            contentFit="cover"
          />
        )}

        {/* Content */}
        <YStack padding="$4" gap="$3">
          <Text fontSize="$7" fontWeight="700" color="$color">
            {post.title}
          </Text>
          <Text fontSize="$4" color="$colorSubtle" lineHeight={22}>
            {post.description}
          </Text>
        </YStack>

        {/* Divider */}
        <YStack
          height={1}
          backgroundColor="$borderColor"
          marginHorizontal="$4"
        />

        {/* Actions */}
        <XStack padding="$4" justifyContent="space-between" alignItems="center">
          <XStack gap="$5" alignItems="center">
            <Pressable onPress={() => toggleLike(post.id)}>
              <XStack gap="$2" alignItems="center">
                <Ionicons
                  name="heart"
                  size={22}
                  color={tokens.color.primary7.val}
                />
                <Text fontSize="$4" color="$colorSubtle">
                  {formatCount(post.likes)}
                </Text>
              </XStack>
            </Pressable>
            <XStack gap="$2" alignItems="center">
              <Ionicons
                name="chatbubble-outline"
                size={20}
                color={tokens.color.grey5.val}
              />
              <Text fontSize="$4" color="$colorSubtle">
                {formatCount(post.comments)}
              </Text>
            </XStack>
          </XStack>

          <Pressable onPress={() => toggleBookmark(post.id)}>
            <Ionicons
              name={post.bookmarked ? "bookmark" : "bookmark-outline"}
              size={22}
              color={
                post.bookmarked
                  ? tokens.color.primary7.val
                  : tokens.color.grey5.val
              }
            />
          </Pressable>
        </XStack>

        {/* Comments placeholder */}
        <YStack padding="$4" gap="$3">
          <Text fontSize="$5" fontWeight="600" color="$color">
            댓글 {post.comments}
          </Text>
          <YStack
            padding="$4"
            backgroundColor="$backgroundStrong"
            borderRadius="$4"
            alignItems="center"
          >
            <Text fontSize="$4" color="$colorSubtle">
              댓글 기능은 준비 중입니다
            </Text>
          </YStack>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
