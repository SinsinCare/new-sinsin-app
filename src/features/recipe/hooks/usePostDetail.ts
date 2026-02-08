import { useQuery, useQueryClient } from "@tanstack/react-query"
import { communityPostService } from "../services/communityPostService"
import { CommunityMealPost } from "../types"

const POSTS_KEY = ["community-posts"] as const

export function usePostDetail(postId: string) {
  const queryClient = useQueryClient()

  const { data: post, isLoading } = useQuery({
    queryKey: ["community-post", postId],
    queryFn: () => communityPostService.getPost(postId),
    initialData: () => {
      const posts = queryClient.getQueryData<CommunityMealPost[]>(POSTS_KEY)
      return posts?.find((p) => p.id === postId)
    },
  })

  return { post, isLoading }
}
