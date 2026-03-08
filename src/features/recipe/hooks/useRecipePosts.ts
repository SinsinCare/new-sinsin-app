import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { recipePostService } from "../services/recipePostService"
import type {
  RecipePost,
  RecipePostFilters,
  CreateRecipeRequest,
} from "../types"

const RECIPES_KEY = ["recipe-posts"] as const

export function useRecipePosts(
  filters?: RecipePostFilters,
  searchQuery?: string,
) {
  const queryClient = useQueryClient()

  const {
    data: posts = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [...RECIPES_KEY, filters, searchQuery],
    queryFn: () => {
      if (searchQuery?.trim()) {
        return recipePostService.searchPosts(searchQuery)
      }
      if (
        filters?.nutritionTags?.length ||
        filters?.stageTags?.length ||
        filters?.cuisineTags?.length
      ) {
        return recipePostService.filterPosts(filters)
      }
      return recipePostService.getPosts()
    },
  })

  const createRecipeMutation = useMutation({
    mutationFn: (req: CreateRecipeRequest) => {
      const newPost = recipePostService.createPost(req)
      return Promise.resolve(newPost)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECIPES_KEY })
    },
  })

  const toggleLikeMutation = useMutation({
    mutationFn: (postId: string) => {
      recipePostService.toggleLike(postId)
      return Promise.resolve()
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: RECIPES_KEY })
      const queries = queryClient.getQueriesData<RecipePost[]>({
        queryKey: RECIPES_KEY,
      })
      for (const [key, data] of queries) {
        if (data) {
          queryClient.setQueryData<RecipePost[]>(
            key,
            data.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    liked: !p.liked,
                    likes: p.liked ? p.likes - 1 : p.likes + 1,
                  }
                : p,
            ),
          )
        }
      }
      return { queries }
    },
    onError: (_err, _id, context) => {
      if (context?.queries) {
        for (const [key, data] of context.queries) {
          queryClient.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: RECIPES_KEY })
    },
  })

  const toggleBookmarkMutation = useMutation({
    mutationFn: (postId: string) => {
      recipePostService.toggleBookmark(postId)
      return Promise.resolve()
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: RECIPES_KEY })
      const queries = queryClient.getQueriesData<RecipePost[]>({
        queryKey: RECIPES_KEY,
      })
      for (const [key, data] of queries) {
        if (data) {
          queryClient.setQueryData<RecipePost[]>(
            key,
            data.map((p) =>
              p.id === postId ? { ...p, bookmarked: !p.bookmarked } : p,
            ),
          )
        }
      }
      return { queries }
    },
    onError: (_err, _id, context) => {
      if (context?.queries) {
        for (const [key, data] of context.queries) {
          queryClient.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: RECIPES_KEY })
    },
  })

  return {
    posts,
    isLoading,
    refetch,
    createRecipe: createRecipeMutation.mutate,
    isCreating: createRecipeMutation.isPending,
    toggleLike: toggleLikeMutation.mutate,
    toggleBookmark: toggleBookmarkMutation.mutate,
  }
}

export function useRecipePost(id: string) {
  const { data: post, isLoading } = useQuery({
    queryKey: ["recipe-post", id],
    queryFn: () => recipePostService.getPost(id),
  })

  return { post, isLoading }
}
