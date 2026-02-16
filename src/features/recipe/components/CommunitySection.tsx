import { YStack, XStack, Text } from "tamagui"
import { CommunityMealPost } from "../types"
import { CommunityPostCard } from "./CommunityPostCard"
import { EmptyPostsPlaceholder } from "./EmptyPostsPlaceholder"

interface CommunitySectionProps {
  posts: CommunityMealPost[]
  isLoading: boolean
  onPostPress: (postId: string) => void
  onLike: (postId: string) => void
  onBookmark: (postId: string) => void
}

export function CommunitySection({
  posts,
  isLoading,
  onPostPress,
  onLike,
  onBookmark,
}: CommunitySectionProps) {
  return (
    <YStack gap="$3" paddingHorizontal="$4" paddingTop="$3">
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$6" fontWeight="700" color="$color">
          커뮤니티 레시피
        </Text>
        <Text fontSize="$5" color="$colorSubtle">
          ···
        </Text>
      </XStack>

      {!isLoading && posts.length === 0 ? (
        <EmptyPostsPlaceholder />
      ) : (
        <YStack gap="$3">
          {posts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              onPress={onPostPress}
              onLike={onLike}
              onBookmark={onBookmark}
            />
          ))}
        </YStack>
      )}
    </YStack>
  )
}
