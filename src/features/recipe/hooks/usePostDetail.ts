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

  const {
    data: comments = [],
    isLoading: isCommentsLoading,
    refetch: refetchComments,
  } = useQuery({
    queryKey: ["community-post-comments", postId],
    queryFn: () => communityPostService.getComments(postId),
    enabled: !!postId,
  })

  const invalidateComments = () => {
    queryClient.invalidateQueries({
      queryKey: ["community-post-comments", postId],
    })
    queryClient.invalidateQueries({ queryKey: ["community-post", postId] })
    queryClient.invalidateQueries({ queryKey: POSTS_KEY })
  }

  const createCommentMutation = useMutation({
    mutationFn: ({
      content,
      parentCommentId,
    }: {
      content: string
      parentCommentId?: string | null
    }) => communityPostService.createComment(postId, content, parentCommentId),
    onSuccess: invalidateComments,
  })

  const updateCommentMutation = useMutation({
    mutationFn: ({
      commentId,
      content,
    }: {
      commentId: string
      content: string
    }) => communityPostService.updateComment(postId, commentId, content),
    onSuccess: invalidateComments,
  })

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      communityPostService.deleteComment(postId, commentId),
    onSuccess: invalidateComments,
  })

  const toggleCommentLikeMutation = useMutation({
    mutationFn: (commentId: string) =>
      communityPostService.toggleCommentLike(postId, commentId),
    onSuccess: invalidateComments,
  })

  const reportCommentMutation = useMutation({
    mutationFn: ({
      commentId,
      reason,
      description,
    }: {
      commentId: string
      reason: string
      description?: string
    }) =>
      communityPostService.reportComment(
        postId,
        commentId,
        reason,
        description,
      ),
  })

  return {
    post,
    comments,
    isLoading,
    isCommentsLoading,
    isError,
    error,
    refetch,
    refetchComments,
    castVote: castVoteMutation.mutate,
    castVoteAsync: castVoteMutation.mutateAsync,
    isVoting: castVoteMutation.isPending,
    createComment: createCommentMutation.mutateAsync,
    isCreatingComment: createCommentMutation.isPending,
    updateComment: updateCommentMutation.mutateAsync,
    isUpdatingComment: updateCommentMutation.isPending,
    deleteComment: deleteCommentMutation.mutateAsync,
    isDeletingComment: deleteCommentMutation.isPending,
    toggleCommentLike: toggleCommentLikeMutation.mutateAsync,
    isTogglingCommentLike: toggleCommentLikeMutation.isPending,
    reportComment: reportCommentMutation.mutateAsync,
    isReportingComment: reportCommentMutation.isPending,
  }
}
