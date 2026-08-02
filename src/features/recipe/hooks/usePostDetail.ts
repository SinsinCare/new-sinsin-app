import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { communityPostService } from "../services/communityPostService"
import { CommunityComment, CommunityMealPost } from "../types"

const POSTS_KEY = ["community-posts"] as const

/** 댓글 트리에서 해당 댓글만 좋아요 토글한 새 트리를 만든다. */
function toggleCommentLikeInTree(
  comments: CommunityComment[],
  commentId: string,
): CommunityComment[] {
  return comments.map((comment) => {
    if (comment.id === commentId) {
      return {
        ...comment,
        liked: !comment.liked,
        likes: comment.liked ? comment.likes - 1 : comment.likes + 1,
      }
    }
    if (comment.replies.length === 0) return comment
    return {
      ...comment,
      replies: toggleCommentLikeInTree(comment.replies, commentId),
    }
  })
}

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

  /**
   * 좋아요·북마크는 상세 캐시(["community-post", id])와 목록 캐시를 함께
   * 낙관 갱신한다. 목록 훅의 토글만 쓰면 상세 화면에는 반영되지 않는다.
   */
  const applyPostPatch = (
    patch: (old: CommunityMealPost) => CommunityMealPost,
  ) => {
    queryClient.setQueryData<CommunityMealPost | undefined>(
      ["community-post", postId],
      (old) => (old ? patch(old) : old),
    )
    queryClient.setQueryData<CommunityMealPost[]>(POSTS_KEY, (old) =>
      (old ?? []).map((item) => (item.id === postId ? patch(item) : item)),
    )
  }

  const invalidatePost = () => {
    queryClient.invalidateQueries({ queryKey: ["community-post", postId] })
    queryClient.invalidateQueries({ queryKey: POSTS_KEY })
  }

  const togglePostLikeMutation = useMutation({
    mutationFn: () => communityPostService.toggleLike(postId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["community-post", postId] })
      const prev = queryClient.getQueryData<CommunityMealPost | undefined>([
        "community-post",
        postId,
      ])
      applyPostPatch((old) => ({
        ...old,
        liked: !old.liked,
        likes: old.liked ? old.likes - 1 : old.likes + 1,
      }))
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["community-post", postId], context.prev)
      }
    },
    onSettled: invalidatePost,
  })

  const togglePostBookmarkMutation = useMutation({
    mutationFn: () => communityPostService.toggleBookmark(postId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["community-post", postId] })
      const prev = queryClient.getQueryData<CommunityMealPost | undefined>([
        "community-post",
        postId,
      ])
      applyPostPatch((old) => ({ ...old, bookmarked: !old.bookmarked }))
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["community-post", postId], context.prev)
      }
    },
    onSettled: invalidatePost,
  })

  const {
    data: comments = [],
    isLoading: isCommentsLoading,
    isError: isCommentsError,
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
      mentions,
    }: {
      content: string
      parentCommentId?: string | null
      mentions?: string[]
    }) =>
      communityPostService.createComment(
        postId,
        content,
        parentCommentId,
        mentions,
      ),
    onSuccess: invalidateComments,
  })

  const updateCommentMutation = useMutation({
    mutationFn: ({
      commentId,
      content,
      mentions,
    }: {
      commentId: string
      content: string
      mentions?: string[]
    }) =>
      communityPostService.updateComment(postId, commentId, content, mentions),
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
    // 하트는 즉시 반응해야 한다 — 낙관 갱신 후 실패 시 되돌린다.
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({
        queryKey: ["community-post-comments", postId],
      })
      const prev = queryClient.getQueryData<CommunityComment[]>([
        "community-post-comments",
        postId,
      ])
      queryClient.setQueryData<CommunityComment[]>(
        ["community-post-comments", postId],
        (old) => (old ? toggleCommentLikeInTree(old, commentId) : old),
      )
      return { prev }
    },
    onError: (_err, _commentId, context) => {
      if (context?.prev) {
        queryClient.setQueryData(
          ["community-post-comments", postId],
          context.prev,
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["community-post-comments", postId],
      })
    },
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
    /*
      댓글 조회가 실패했다. 화면이 이걸 안 보면 **"아직 댓글이 없어요"** 를 띄우는데,
      글쓴이 입장에서는 달린 댓글이 사라진 것으로 보인다.

      호출부는 반드시 `isCommentsError && comments.length === 0` 으로 볼 것 — 댓글을
      단 직후의 백그라운드 재조회가 실패했을 때 이미 그린 목록을 지우면 안 된다.
    */
    isCommentsError,
    isError,
    error,
    refetch,
    refetchComments,
    castVote: castVoteMutation.mutate,
    castVoteAsync: castVoteMutation.mutateAsync,
    isVoting: castVoteMutation.isPending,
    togglePostLike: togglePostLikeMutation.mutate,
    togglePostBookmark: togglePostBookmarkMutation.mutate,
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
