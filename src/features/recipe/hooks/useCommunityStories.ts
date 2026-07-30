import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { communityStoryService } from "../services/communityStoryService"
import type {
  CommunityStory,
  CreateCommunityStoryInput,
  StorySort,
} from "../types/story"

const STORIES_KEY = ["community-stories"] as const
const storiesKey = (sort: StorySort) => [...STORIES_KEY, sort]

export function useCommunityStories(sort: StorySort = "recommended") {
  const queryClient = useQueryClient()
  const queryKey = storiesKey(sort)

  const {
    data: stories = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => communityStoryService.getStories(sort),
    // 추천은 매번 새로 섞여 나오므로 오래 들고 있지 않는다.
    staleTime: 60_000,
  })

  const createStoryMutation = useMutation({
    mutationFn: (input: CreateCommunityStoryInput) =>
      communityStoryService.createStory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORIES_KEY })
    },
  })

  const deleteStoryMutation = useMutation({
    mutationFn: (storyId: string) => communityStoryService.deleteStory(storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORIES_KEY })
    },
  })

  const toggleLikeMutation = useMutation({
    mutationFn: (storyId: string) => communityStoryService.toggleLike(storyId),
    onMutate: async (storyId) => {
      await queryClient.cancelQueries({ queryKey })
      const prev = queryClient.getQueryData<CommunityStory[]>(queryKey)
      queryClient.setQueryData<CommunityStory[]>(queryKey, (old) =>
        (old ?? []).map((story) =>
          story.id === storyId
            ? {
                ...story,
                liked: !story.liked,
                likes: story.liked ? story.likes - 1 : story.likes + 1,
              }
            : story,
        ),
      )
      return { prev }
    },
    onError: (_err, _storyId, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: STORIES_KEY })
    },
  })

  return {
    stories,
    isLoading,
    refetch,
    createStoryAsync: createStoryMutation.mutateAsync,
    isCreating: createStoryMutation.isPending,
    deleteStory: deleteStoryMutation.mutate,
    toggleLike: toggleLikeMutation.mutate,
  }
}
