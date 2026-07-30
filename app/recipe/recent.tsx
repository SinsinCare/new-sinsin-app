// 최근 본 기록 — 계약 §2 `GET /recipes/views/recent`.
//
// `saved.tsx` 와 같은 화면을 시작 탭만 바꿔 그린다(그쪽 주석 참고).

import { RecipeArchiveScreen } from "@/src/features/recipe/archive/RecipeArchiveScreen"

export default function RecentRecipesRoute() {
  return <RecipeArchiveScreen initialTab="recent" />
}
