import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { mealRecommendationService } from "@/src/services/data"
import type {
  MealType,
  MealRecommendationResponse,
  RecommendationCategory,
} from "../types"
import { useTranslation } from "react-i18next"

const MEAL_REC_KEY = ["meal-recommendations"] as const

function getTodayDateStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function useMealRecommendations(
  mealType: MealType,
  category: RecommendationCategory = "all",
) {
  const { i18n } = useTranslation()
  const queryClient = useQueryClient()
  const todayStr = getTodayDateStr()
  const locale = i18n.language.startsWith("en") ? "en" : "ko"
  const queryKey = [...MEAL_REC_KEY, locale, mealType, category, todayStr]

  const { data, isLoading, error, refetch } =
    useQuery<MealRecommendationResponse>({
      queryKey,
      queryFn: () =>
        mealRecommendationService.getRecommendations(mealType, category),
    })

  const refreshMutation = useMutation({
    mutationFn: () =>
      mealRecommendationService.refreshRecommendations(mealType, category),
    onSuccess: (newData) => {
      queryClient.setQueryData(
        queryKey,
        newData,
      )
    },
  })

  const dismissMutation = useMutation({
    mutationFn: ({
      itemType,
      itemId,
    }: {
      itemType: "RECIPE" | "RESTAURANT_MENU"
      itemId: number
    }) => mealRecommendationService.dismissRecommendation(itemType, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEAL_REC_KEY })
    },
  })

  const bookmarkMutation = useMutation({
    mutationFn: ({
      itemType,
      itemId,
    }: {
      itemType: "RECIPE" | "RESTAURANT_MENU"
      itemId: number
    }) => mealRecommendationService.toggleBookmark(itemType, itemId),
  })

  return {
    recommendations: data,
    isLoading,
    error,
    refetch,
    refresh: refreshMutation.mutate,
    isRefreshing: refreshMutation.isPending,
    dismiss: dismissMutation.mutate,
    toggleBookmark: bookmarkMutation.mutate,
  }
}

/** Invalidate all meal recommendation queries (e.g. after diary registration) */
export function useInvalidateMealRecommendations() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: MEAL_REC_KEY })
}
