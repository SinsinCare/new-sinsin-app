import { XStack, YStack, Text } from "tamagui"
import { Pressable } from "react-native"
import { Image } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { tokens } from "@/src/theme/tokens"
import { CommunityMealPost } from "../types"

interface CommunityPostCardProps {
  post: CommunityMealPost
  onPress: (postId: string) => void
  onLike: (postId: string) => void
  onBookmark: (postId: string) => void
}

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

export function CommunityPostCard({
  post,
  onPress,
  onLike,
  onBookmark,
}: CommunityPostCardProps) {
  return (
    <Pressable onPress={() => onPress(post.id)}>
    <YStack
      backgroundColor="$cardBackground"
      borderRadius="$4"
      overflow="hidden"
      borderWidth={1}
      borderColor="$borderColor"
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 1 }}
      shadowOpacity={0.08}
      shadowRadius={4}
      elevation={2}
    >
      {/* Author header */}
      <XStack padding="$3" alignItems="center" gap="$2">
        <YStack
          width={36}
          height={36}
          borderRadius="$12"
          backgroundColor="$backgroundStrong"
          alignItems="center"
          justifyContent="center"
        >
          <Ionicons name="person" size={18} color={tokens.color.grey5.val} />
        </YStack>
        <YStack flex={1}>
          <Text fontSize="$4" fontWeight="600" color="$color">
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
          style={{ width: "100%", height: 200 }}
          contentFit="cover"
        />
      )}

      {/* Content */}
      <YStack padding="$3" gap="$2">
        <Text fontSize="$5" fontWeight="700" color="$color">
          {post.title}
        </Text>
        <Text fontSize="$4" color="$colorSubtle" numberOfLines={2}>
          {post.description}
        </Text>
      </YStack>

      {/* Actions */}
      <XStack
        paddingHorizontal="$3"
        paddingBottom="$3"
        justifyContent="space-between"
        alignItems="center"
      >
        <XStack gap="$4" alignItems="center">
          <Pressable onPress={() => onLike(post.id)}>
            <XStack gap="$1" alignItems="center">
              <Ionicons
                name="heart"
                size={18}
                color={tokens.color.primary7.val}
              />
              <Text fontSize="$3" color="$colorSubtle">
                {formatCount(post.likes)}
              </Text>
            </XStack>
          </Pressable>
          <XStack gap="$1" alignItems="center">
            <Ionicons
              name="chatbubble-outline"
              size={16}
              color={tokens.color.grey5.val}
            />
            <Text fontSize="$3" color="$colorSubtle">
              {post.comments}
            </Text>
          </XStack>
        </XStack>

        <Pressable onPress={() => onBookmark(post.id)}>
          <Ionicons
            name={post.bookmarked ? "bookmark" : "bookmark-outline"}
            size={18}
            color={
              post.bookmarked
                ? tokens.color.primary7.val
                : tokens.color.grey5.val
            }
          />
        </Pressable>
      </XStack>
    </YStack>
    </Pressable>
  )
}
