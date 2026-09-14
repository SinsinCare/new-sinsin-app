import { RecipeWriteScreen } from "@/src/features/recipe/views/RecipeWriteScreen"
import { useGoBack } from "@/src/shared/navigation"

/**
 * 레시피 작성 v2. v1 의 `RecipeEditor`(블록 에디터 3개 + 조리순서 시트, 2026-09-09 삭제)를 대신한다.
 *
 * 화면 구성과 그 이유는 `RecipeWriteScreen` 머리말에 있다. 여기서는 라우팅만 한다 —
 * 폼이 자기 상태를 다 들고 있어서 이 파일에 넘길 것이 없다.
 */
export default function RecipeNewScreen() {
  const goBack = useGoBack()
  return <RecipeWriteScreen onClose={goBack} />
}
