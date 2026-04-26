import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { communityPostService } from "../services/communityPostService"
import { CommunityMealPost } from "../types"

const POSTS_KEY = ["community-posts"] as const

export function useCommunityPosts() {
  const queryClient = useQueryClient()

  const {
    data: posts = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: POSTS_KEY,
    queryFn: () => communityPostService.getPosts(),
  })

  const createPostMutation = useMutation({
    mutationFn: (
      post: Omit<
        CommunityMealPost,
        "id" | "likes" | "liked" | "comments" | "bookmarked" | "createdAt"
      >,
    ) => communityPostService.createPost(post),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POSTS_KEY })
    },
  })

  const updatePostMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string
      category?: string
      title?: string
      description?: string
      imageUri?: string | null
    }) => communityPostService.updatePost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POSTS_KEY })
    },
  })

  const deletePostMutation = useMutation({
    mutationFn: (postId: string) => communityPostService.deletePost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: POSTS_KEY })
      const prev = queryClient.getQueryData<CommunityMealPost[]>(POSTS_KEY)
      queryClient.setQueryData<CommunityMealPost[]>(POSTS_KEY, (old) =>
        (old ?? []).filter((p) => p.id !== postId),
      )
      return { prev }
    },
    onError: (_err, _id, context) => {
      if (context?.prev) {
        queryClient.setQueryData(POSTS_KEY, context.prev)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: POSTS_KEY })
    },
  })

  const toggleLikeMutation = useMutation({
    mutationFn: (postId: string) => communityPostService.toggleLike(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: POSTS_KEY })
      const prev = queryClient.getQueryData<CommunityMealPost[]>(POSTS_KEY)
      queryClient.setQueryData<CommunityMealPost[]>(POSTS_KEY, (old) =>
        (old ?? []).map((p) =>
          p.id === postId
            ? {
                ...p,
                liked: !p.liked,
                likes: p.liked ? p.likes - 1 : p.likes + 1,
              }
            : p,
        ),
      )
      return { prev }
    },
    onError: (_err, _id, context) => {
      if (context?.prev) {
        queryClient.setQueryData(POSTS_KEY, context.prev)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: POSTS_KEY })
    },
  })

  const toggleBookmarkMutation = useMutation({
    mutationFn: (postId: string) => communityPostService.toggleBookmark(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: POSTS_KEY })
      const prev = queryClient.getQueryData<CommunityMealPost[]>(POSTS_KEY)
      queryClient.setQueryData<CommunityMealPost[]>(POSTS_KEY, (old) =>
        (old ?? []).map((p) =>
          p.id === postId ? { ...p, bookmarked: !p.bookmarked } : p,
        ),
      )
      return { prev }
    },
    onError: (_err, _id, context) => {
      if (context?.prev) {
        queryClient.setQueryData(POSTS_KEY, context.prev)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: POSTS_KEY })
    },
  })

  const reportPostMutation = useMutation({
    mutationFn: ({ postId, reason, description }: { postId: string; reason: string; description?: string }) =>
      communityPostService.reportPost(postId, reason, description),
  })

  return {
    posts,
    isLoading,
    refetch,
    createPost: createPostMutation.mutate,
    isCreating: createPostMutation.isPending,
    updatePost: updatePostMutation.mutate,
    isUpdating: updatePostMutation.isPending,
    deletePost: deletePostMutation.mutate,
    isDeleting: deletePostMutation.isPending,
    toggleLike: toggleLikeMutation.mutate,
    toggleBookmark: toggleBookmarkMutation.mutate,
    reportPost: reportPostMutation.mutate,
    isReporting: reportPostMutation.isPending,
  }
}
