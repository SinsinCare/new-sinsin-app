import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { communityPostService } from "../services/communityPostService"
import { CommunityMealPost } from "../types"

const POSTS_KEY = ["community-posts"] as const

export function usePostDetail(postId: string) {
  const queryClient = useQueryClient()

  const {
    data: post,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["community-post", postId],
    queryFn: () => communityPostService.getPost(postId),
    initialData: () => {
      const posts = queryClient.getQueryData<CommunityMealPost[]>(POSTS_KEY)
      return posts?.find((p) => p.id === postId)
    },
  })

  const castVoteMutation = useMutation({
    mutationFn: (optionIds: number[]) =>
      communityPostService.castVote(postId, optionIds),
    onSuccess: (vote) => {
      queryClient.setQueryData<CommunityMealPost | undefined>(
        ["community-post", postId],
        (old) => (old ? { ...old, vote } : old),
      )
      queryClient.setQueryData<CommunityMealPost[]>(POSTS_KEY, (old) =>
        (old ?? []).map((item) =>
          item.id === postId ? { ...item, vote } : item,
        ),
      )
      queryClient.invalidateQueries({ queryKey: ["community-post", postId] })
      queryClient.invalidateQueries({ queryKey: POSTS_KEY })
    },
  })

  return {
    post,
    isLoading,
    isError,
    error,
    refetch,
    castVote: castVoteMutation.mutate,
    castVoteAsync: castVoteMutation.mutateAsync,
    isVoting: castVoteMutation.isPending,
  }
}
