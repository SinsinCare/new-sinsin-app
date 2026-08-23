import { RecipeHomeScreen } from "@/src/features/recipe/views/RecipeHomeScreen"

/**
 * 레시피 탭.
 *
 * 화면 본문은 `src/features/recipe/views/RecipeHomeScreen` 에 있다 —
 * 라우트는 자리만 잡고 렌더 트리를 들고 있지 않는다
 * (`docs/mobile-frontend-architecture.md`: 라우트 100줄 규칙).
 * 여기 869줄이 통째로 들어 있던 것이 전 탭 중 유일한 예외였다.
 */
export default function RecipeRoute() {
  return <RecipeHomeScreen />
}
