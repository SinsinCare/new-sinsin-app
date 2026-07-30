import { useInfiniteQuery } from "@tanstack/react-query"
import { recipeCatalogService } from "../services/recipeCatalogService"
import { useTranslation } from "react-i18next"
import { normalizeLanguage } from "@/src/i18n"

const PAGE_SIZE = 20

const CATEGORY_MAP: Record<string, string> = {
  korean: "한식",
  chinese: "중식",
  japanese: "일식",
  western: "양식",
  american: "양식",
  salad: "샐러드",
  dessert: "디저트",
  beverage: "음료",
  drink: "음료",
}

const TAG_MAP: Record<string, string> = {
  "low-salt": "저염식",
  "low-protein": "저단백",
  "low-potassium": "저칼륨",
  "low-phosphorus": "저인",
  "high-calorie": "고열량",
  ckd3: "CKD3",
  ckd4: "CKD4",
  ckd5: "CKD5",
  diabetes: "당뇨",
  hypertension: "고혈압",
}

function mapFilterKeys(keys: readonly string[], map: Record<string, string>) {
  return keys.map((key) => map[key] ?? key)
}

interface UseInfiniteRecipesParams {
  search: string
  categoryKeys: readonly string[]
  tagKeys: readonly string[]
}

export function useInfiniteRecipes({
  search,
  categoryKeys,
  tagKeys,
}: UseInfiniteRecipesParams) {
  const { i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
  const categories = mapFilterKeys(categoryKeys, CATEGORY_MAP)
  const tags = mapFilterKeys(tagKeys, TAG_MAP)

  return useInfiniteQuery({
    queryKey: ["recipes", language, search, categories, tags],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      recipeCatalogService.getRecipes({
        limit: PAGE_SIZE,
        cursor: pageParam,
        search,
        categories,
        tags,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  })
}
