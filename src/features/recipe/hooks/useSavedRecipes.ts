// 저장한 레시피 목록 훅 — 계약 §2 `GET /recipes/saved`.
//
// 검색·필터·무한 스크롤·저장 낙관 갱신은 "최근 본 기록" 과 완전히 같아서
// `archive/useRecipeArchiveList` 에 한 벌만 두고 여기서는 출처만 고정한다.
// 훅을 둘로 나눠 두는 이유는 (a) 호출부가 무엇을 읽는지 이름으로 드러나야 하고,
// (b) react-query 캐시 키가 출처별로 갈려야 하기 때문이다.

import type { RecipeFilterSelection } from "../components/list/recipeListFilterModel"
import {
  useRecipeArchiveList,
  type UseRecipeArchiveListResult,
} from "../archive/useRecipeArchiveList"

export interface UseSavedRecipesParams {
  /** 확정된 검색어(화면에서 디바운스한 값). */
  q: string
  filter: RecipeFilterSelection
  /** 보이지 않는 탭까지 미리 받지 않도록 끌 수 있다. */
  enabled?: boolean
}

export function useSavedRecipes({
  q,
  filter,
  enabled = true,
}: UseSavedRecipesParams): UseRecipeArchiveListResult {
  return useRecipeArchiveList({ source: "saved", q, filter, enabled })
}
