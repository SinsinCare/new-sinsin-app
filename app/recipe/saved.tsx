// 저장한 레시피 — 계약 §2 `GET /recipes/saved`.
//
// 라우트는 시작 탭만 정하고 화면은 `RecipeArchiveScreen` 하나가 그린다. 시안대로 두
// 탭을 한 화면에서 전환하는데, 전환을 라우팅으로 하면 검색어·필터가 매번 초기화된다.
// 그래서 전환은 화면 안의 상태이고, 이 라우트는 딥링크·바로가기의 진입점이다.

import { RecipeArchiveScreen } from "@/src/features/recipe/archive/RecipeArchiveScreen"

export default function SavedRecipesRoute() {
  return <RecipeArchiveScreen initialTab="saved" />
}
