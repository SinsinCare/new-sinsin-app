// 최근 본 기록 훅 — 계약 §2 `GET /recipes/views/recent`.
//
// 서버는 `recipe_view` 를 사용자·레시피당 한 행으로 두고 `viewed_at` 만 갱신한다
// (계약 §5, `ON CONFLICT DO UPDATE`). 그래서 이 목록에는 같은 레시피가 두 번 나오지
// 않는다 — **앱에서 중복을 지우지 않는다.** 지우는 코드를 넣으면 서버가 중복을
// 내보내기 시작해도 아무도 눈치채지 못한다.
//
// 저장 낙관 갱신은 이 탭에서도 그대로 동작한다: 최근 본 기록은 저장 여부와 무관하게
// 쌓이므로 북마크를 눌러도 행이 사라지지 않는다.

import type { RecipeFilterSelection } from "../components/list/recipeListFilterModel"
import {
  useRecipeArchiveList,
  type UseRecipeArchiveListResult,
} from "../archive/useRecipeArchiveList"

export interface UseRecentRecipesParams {
  /** 확정된 검색어(화면에서 디바운스한 값). */
  q: string
  filter: RecipeFilterSelection
  /** 보이지 않는 탭까지 미리 받지 않도록 끌 수 있다. */
  enabled?: boolean
}

export function useRecentRecipes({
  q,
  filter,
  enabled = true,
}: UseRecentRecipesParams): UseRecipeArchiveListResult {
  return useRecipeArchiveList({ source: "recent", q, filter, enabled })
}
